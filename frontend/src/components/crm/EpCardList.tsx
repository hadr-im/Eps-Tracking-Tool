//  EpCardList 

import { Skeleton } from '@/components/ui/skeleton';
import { EpCard }   from './EpCard';
import type { Ep, TrackingPhase } from '@/types/ep';

interface EpCardListProps {
  eps: Ep[];
  isLoading: boolean;
  pendingId: string | null;
  onCheckboxUpdate: (id: string, field: 'contacted' | 'interested', value: boolean) => void;
  onPhaseUpdate:    (id: string, phase: TrackingPhase | null) => void;
  onTextUpdate:     (id: string, field: string, value: string | null) => void;
}

export function EpCardList({
  eps,
  isLoading,
  pendingId,
  onCheckboxUpdate,
  onPhaseUpdate,
  onTextUpdate,
}: EpCardListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            {/* Section 1 skeleton */}
            <div className="px-4 pt-3.5 pb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            {/* Section 2 skeleton */}
            <div className="px-4 py-3 border-t space-y-2.5">
              <Skeleton className="h-7 w-full rounded-lg" />
              <Skeleton className="h-4 w-44" />
            </div>
            {/* Section 3 skeleton */}
            <div className="px-4 py-3 border-t bg-muted/30 space-y-2">
              <Skeleton className="h-3 w-48" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (eps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <p>No EPs found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {eps.map((ep) => (
        <EpCard
          key={ep.id}
          ep={ep}
          isPending={pendingId === ep.id}
          onCheckboxUpdate={onCheckboxUpdate}
          onPhaseUpdate={onPhaseUpdate}
          onTextUpdate={onTextUpdate}
        />
      ))}
    </div>
  );
}
