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
  onConfirm: () => void;
  isPending: boolean;
}

export function TransitionDialog({
  open,
  onOpenChange,
  targetProduct,
  onConfirm,
  isPending,
}: TransitionDialogProps) {
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
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" disabled={isPending} />
            }
          >
            Cancel
          </DialogClose>
          <Button
            onClick={onConfirm}
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
