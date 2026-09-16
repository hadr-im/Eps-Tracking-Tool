import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface TransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetProduct: string | null;
  onConfirm: (note?: string) => void;
  isPending: boolean;
}

export function TransitionDialog({
  open,
  onOpenChange,
  targetProduct,
  onConfirm,
  isPending,
}: TransitionDialogProps) {
  const [note, setNote] = useState('');

  // Reset note when dialog closes
  if (!open && note) {
    setNote('');
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Transition EP to {targetProduct}?</DialogTitle>
          <DialogDescription>
            This EP will be sent to the{' '}
            <span className="font-semibold text-foreground">{targetProduct}</span>{' '}
            department and returned to the unassigned leads pool.
            All notes, comments, and tracking history will be preserved.
            <br /><br />
            You will no longer see this EP in your CRM.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label htmlFor="transition-note" className="text-sm font-medium flex justify-between mb-1.5">
            Note
            <span className="text-xs text-muted-foreground font-normal">Optional</span>
          </label>
          <textarea
            id="transition-note"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Why is this EP being transitioned?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={isPending} />
            }
          >
            Cancel
          </DialogClose>
          <Button
            onClick={() => onConfirm(note.trim() || undefined)}
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Transition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
