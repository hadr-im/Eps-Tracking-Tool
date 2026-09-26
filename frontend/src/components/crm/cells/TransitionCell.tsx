import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransitionDialog } from '../TransitionDialog';
import GVLogo  from '@/assets/GV-SIGNUP.png';
import GTALogo from '@/assets/GTA-SIGNUP.png';
import GTELogo from '@/assets/GTE-SIGNUP.png';

const ALL_PRODUCTS = ['GV', 'GTA', 'GTE'] as const;
type Product = typeof ALL_PRODUCTS[number];

const PRODUCT_CONFIG: Record<Product, { color: string; logo: string }> = {
  GV:  { color: 'var(--gv)',  logo: GVLogo },
  GTA: { color: 'var(--gta)', logo: GTALogo },
  GTE: { color: 'var(--gte)', logo: GTELogo },
};

interface TransitionCellProps {
  epId: string;
  currentProduct: string;
  isPending: boolean;
  onTransition: (epId: string, targetProduct: string, note?: string) => void;
}

export function TransitionCell({
  epId,
  currentProduct,
  isPending,
  onTransition,
}: TransitionCellProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const availableTargets = ALL_PRODUCTS.filter((p) => p !== currentProduct);

  const handleSelect = (val: string) => {
    setSelectedTarget(val);
    setDialogOpen(true);
  };

  const handleConfirm = (note?: string) => {
    if (!selectedTarget) return;
    onTransition(epId, selectedTarget, note);
  };

  const handleOpenChange = (open: boolean) => {
    if (!isPending) {
      setDialogOpen(open);
      if (!open) setSelectedTarget(null);
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
          className={`h-8 w-full min-w-fit px-3 py-1 text-xs border border-border bg-transparent rounded-full ${
            isPending ? 'opacity-50' : 'hover:border-violet-300'
          }`}
          aria-label="Transition EP"
        >
          <SelectValue placeholder="move to" className="justify-center">
            {(v) => (v ? `To ${v}` : 'move to')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableTargets.map((p) => {
            const cfg = PRODUCT_CONFIG[p as Product];
            return (
              <SelectItem key={p} value={p} label={`To ${p}`} className="text-sm">
                <img src={cfg.logo} alt={p} className="h-5 w-5 shrink-0 object-contain" />
                <span style={{ color: cfg.color }} className="font-semibold">
                  {p}
                </span>
              </SelectItem>
            );
          })}
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
