//  MyCrmPage: core daily-driver screen for MEMBER users
// - Filters bar (debounced search + selects, synced to URL)
// - "Leads Processed" badge
// - Desktop: TanStack Table with sticky columns
// - Mobile: expandable cards
// All inline edits call PATCH /eps/:id via useUpdateEp

import { useState, useMemo, useCallback } from 'react';
import { useUpdateEp }  from '@/hooks/useUpdateEp';
import { useEps }       from '@/hooks/useEps';
import { CrmFilters }   from '@/components/crm/CrmFilters';
import { EpTable }      from '@/components/crm/EpTable';
import { EpCardList }   from '@/components/crm/EpCardList';
import { Badge }        from '@/components/ui/badge';
import type { EpFilters, TrackingPhase } from '@/types/ep';

export default function MyCrmPage() {
  // Filters (set by CrmFilters, consumed by useEps) 
  const [filters, setFilters] = useState<EpFilters>({});

  // Data fetching 
  const { data: eps = [], isLoading } = useEps(filters);

  // Mutations 
  const { mutate, isPending, variables } = useUpdateEp();

  // Track which EP ID is currently being mutated (for per-row pending state)
  const pendingId = isPending && variables ? variables.id : null;

  // Leads processed stats 
  const contactedCount = useMemo(() => eps.filter((ep) => ep.contacted).length, [eps]);

  // Shared mutation handlers 

  const handleCheckboxUpdate = useCallback(
    (id: string, field: 'contacted' | 'interested', value: boolean) => {
      mutate({ id, payload: { [field]: value } });
    },
    [mutate],
  );

  const handlePhaseUpdate = useCallback(
    (id: string, phase: TrackingPhase | null) => {
      mutate({ id, payload: { trackingPhase: phase } });
    },
    [mutate],
  );

  const handleTextUpdate = useCallback(
    (id: string, field: string, value: string | null) => {
      mutate({ id, payload: { [field]: value } });
    },
    [mutate],
  );

  // Render 
  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="shrink-0 px-4 md:px-6 pt-5 pb-3 border-b bg-card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight">My CRM</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and track your assigned EPs
            </p>
          </div>

          {/* Leads Processed badge */}
          {!isLoading && (
            <Badge
              id="leads-processed-badge"
              variant="outline"
              className="text-sm font-semibold px-3 py-1 gap-1.5 bg-emerald-500 text-white border-emerald-500"
            >
              <span className="text-base font-bold">{contactedCount}</span>
              <span className="text-base font-bold">/ {eps.length}</span>
              <span>Leads Contacted</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <CrmFilters onFiltersChange={setFilters} />
      </div>

      {/* Table (desktop) / Cards (mobile) */}

      {/* Desktop: flex-1 min-h-0 so EpTable's own wrapper is the sole scroll container */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <EpTable
          eps={eps}
          isLoading={isLoading}
          pendingId={pendingId}
          onCheckboxUpdate={handleCheckboxUpdate}
          onPhaseUpdate={handlePhaseUpdate}
          onTextUpdate={handleTextUpdate}
        />
      </div>

      {/* Mobile: outer div owns the scroll for the card list */}
      <div className="md:hidden flex-1 overflow-auto px-4 py-4">
        <EpCardList
          eps={eps}
          isLoading={isLoading}
          pendingId={pendingId}
          onCheckboxUpdate={handleCheckboxUpdate}
          onPhaseUpdate={handlePhaseUpdate}
          onTextUpdate={handleTextUpdate}
        />
      </div>
    </div>
  );
}
