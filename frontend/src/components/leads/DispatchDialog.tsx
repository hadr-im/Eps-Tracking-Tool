// Modal for assigning a lead EP to a department member
// Visible only when the caller is a dispatcher TL (user.isDispatcher = true)
// Shows a member dropdown populated from the department roster
// On confirm: calls POST /dispatch, closes modal, dispatched row disappears

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDispatch }          from '@/hooks/useDispatch';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import type { Lead }            from '@/types/lead';

interface DispatchDialogProps {
  lead: Lead | null;           // null = dialog closed
  departmentId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DispatchDialog({
  lead,
  departmentId,
  onClose,
  onSuccess,
}: DispatchDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const { data: members = [], isLoading: membersLoading } = useDepartmentMembers(departmentId);
  const { mutate: dispatch, isPending } = useDispatch();

  function handleConfirm() {
    if (!lead || !selectedMemberId) return;

    dispatch(
      { epIds: [lead.id], memberId: selectedMemberId },
      {
        onSuccess: () => {
          setSelectedMemberId('');
          onClose();
          onSuccess?.();
        },
      },
    );
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setSelectedMemberId('');
      onClose();
    }
  }

  // Filter to members only (exclude TLs from the member dropdown)
  const memberOptions = members.filter((m) => m.role === 'MEMBER');

  return (
    <Dialog open={!!lead} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Dispatch Lead</DialogTitle>
          <DialogDescription className="text-sm">
            Assign{' '}
            <span className="font-semibold text-foreground">{lead?.fullName}</span>{' '}
            to a team member.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {/* EP summary */}
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs space-y-1 text-muted-foreground">
            <p><span className="font-medium text-foreground">EP ID:</span> {lead?.id}</p>
            {lead?.university && (
              <p><span className="font-medium text-foreground">University:</span> {lead.university}</p>
            )}
            <p><span className="font-medium text-foreground">Product:</span> {lead?.product}</p>
          </div>

          {/* Member dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="dispatch-member" className="text-sm font-medium">
              Assign to
            </label>
            {membersLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 size={13} className="animate-spin" />
                Loading members…
              </div>
            ) : (
              <Select
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <SelectTrigger id="dispatch-member" className="w-full">
                  <SelectValue placeholder="Select a member…" />
                </SelectTrigger>
                <SelectContent>
                  {memberOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                  {memberOptions.length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No members available
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedMemberId || isPending}
            onClick={handleConfirm}
          >
            {isPending ? (
              <>
                <Loader2 size={13} className="animate-spin mr-1.5" />
                Dispatching…
              </>
            ) : (
              'Confirm Dispatch'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
