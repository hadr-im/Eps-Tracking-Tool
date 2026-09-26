// StepIndicator — "Step 1 of 2" progress bar for the signup flow.

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  current: number;
  total: number;
  className?: string;
}

export function StepIndicator({ current, total, className }: StepIndicatorProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < current ? 'bg-sidebar-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Step {current} of {total}
      </p>
    </div>
  );
}
