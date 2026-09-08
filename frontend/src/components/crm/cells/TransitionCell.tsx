import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransitionDialog } from '../TransitionDialog';

const ALL_PRODUCTS = ['GV', 'GTA', 'GTE'];

interface TransitionCellProps {
  epId: string;
  currentProduct: string;
  isPending: boolean;
  onTransition: (epId: string, targetProduct: string) => void;
}

export function TransitionCell({
  epId,
  currentProduct,
  isPending,
  onTransition,
}: TransitionCellProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Derive legal targets (anything except the current product)
  const availableTargets = ALL_PRODUCTS.filter((p) => p !== currentProduct);

  const handleSelect = (val: string) => {
    setSelectedTarget(val);
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedTarget) return;
    onTransition(epId, selectedTarget);
    // Dialog stays open displaying spinner, parent hook handles invalidation which will unmount this cell entirely
  };

  const handleOpenChange = (open: boolean) => {
    // Only allow closing if not currently mutating
    if (!isPending) {
      setDialogOpen(open);
      if (!open) {
        // Reset select visually when dialog is cancelled
        setSelectedTarget(null);
      }
    }
  };

  return (
    <>
      <Select
        value={selectedTarget ?? ''}
        onValueChange={(val) => val && handleSelect(val)}
        disabled={isPending}
      >
        <SelectTrigger
          className={`h-7 w-full min-w-fit px-2 py-1 text-xs border-dashed bg-transparent transition-colors ${
            isPending ? 'opacity-50' : 'hover:border-violet-300'
          }`}
          aria-label="Transition EP"
        >
          <SelectValue placeholder="Move to…" className="justify-center">
            {(v) => (v ? `To ${v}` : 'Move to…')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableTargets.map((p) => (
            <SelectItem key={p} value={p} className="text-xs">
              To {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TransitionDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        targetProduct={selectedTarget}
        onConfirm={handleConfirm}
        isPending={isPending}
      />
    </>
  );
}
