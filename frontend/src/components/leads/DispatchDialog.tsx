// Modal for assigning one or more lead EPs to a department member
// Visible only to Team Leaders and VPs, who may assign leads to any member.

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
import { Button }   from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSearchInput,
  matchesQuery,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SEARCH_THRESHOLD } from '@/components/filters/FilterSelect';
import { useDispatch }          from '@/hooks/useDispatch';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import type { Lead }            from '@/types/lead';

interface DispatchDialogProps {
  open: boolean;
  leads: Lead[];
  departmentId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DispatchDialog({
  open,
  leads,
  departmentId,
  onClose,
  onSuccess,
}: DispatchDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const { data: members = [], isLoading: membersLoading } = useDepartmentMembers(departmentId);
  const { mutate: dispatch, isPending } = useDispatch();

  function handleConfirm() {
    if (leads.length === 0 || !selectedMemberId) return;

    dispatch(
      { 
        epIds: leads.map((l) => l.id), 
        memberId: selectedMemberId,
      },
      {
        onSuccess: () => {
          setSelectedMemberId('');
          onClose();
          onSuccess?.();
        },
      },
    );
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setSelectedMemberId('');
      onClose();
    }
  }

  // Include all department members (Members, TLs, VPs)
  const memberOptions = members;

  const [memberQuery, setMemberQuery] = useState('');
  const visibleMembers = memberQuery
    ? memberOptions.filter((m) => matchesQuery(m.fullName, memberQuery))
    : memberOptions;

  const leadCount = leads.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Dispatch {leadCount} Lead{leadCount !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Assign {leadCount === 1 ? 'this lead' : 'these leads'} to a team member.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Member dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="dispatch-member" className="text-sm font-medium">
              Assign to <span className="text-destructive">*</span>
            </label>
            {membersLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 size={13} className="animate-spin" />
                Loading members…
              </div>
            ) : (
              <Select
                value={selectedMemberId}
                onValueChange={(v) => setSelectedMemberId(v ?? '')}
                onOpenChange={(open) => { if (!open) setMemberQuery(''); }}
              >
                <SelectTrigger id="dispatch-member" className="w-full">
                  <SelectValue placeholder="Select a member…">
                    {(val: string) => (val ? members.find((m) => m.id === val)?.fullName ?? val : 'Select a member…')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {/*
                    The one dropdown in the app where picking the wrong row
                    hands somebody else's leads to the wrong person, and a
                    department of twenty-odd names is scrolled rather than
                    read. Worth searching.
                  */}
                  {memberOptions.length > SEARCH_THRESHOLD && (
                    <SelectSearchInput
                      value={memberQuery}
                      onChange={setMemberQuery}
                      placeholder="Search members…"
                    />
                  )}
                  {visibleMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id} label={m.fullName}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                  {visibleMembers.length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {memberQuery ? `Nothing matches “${memberQuery}”` : 'No members available'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

        </div>

        <DialogFooter className="gap-2 pt-2">
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
