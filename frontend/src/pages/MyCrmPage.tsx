//  MyCrmPage: core daily-driver screen for MEMBER users
// - Filters bar (debounced search + selects, synced to URL)
// - "Leads Processed" badge
// - Desktop: TanStack Table with sticky columns
// All inline edits call PATCH /eps/:id via useUpdateEp

import { useState, useMemo, useCallback } from 'react';
import { useUpdateEp }    from '@/hooks/useUpdateEp';
import { useTransitionEp } from '@/hooks/useTransitionEp';
import { useEps }         from '@/hooks/useEps';
import { CrmFilters }   from '@/components/crm/CrmFilters';
import { EpTable }      from '@/components/crm/EpTable';
import { EpCardList }   from '@/components/crm/EpCardList';
import { CommentPanel } from '@/components/team/CommentPanel';
import { Badge }        from '@/components/ui/badge';
import type { EpFilters, TrackingPhase } from '@/types/ep';

export default function MyCrmPage() {
  // Filters (set by CrmFilters, consumed by useEps) 
  const [filters, setFilters] = useState<EpFilters>({});

  // Comment panel state
  const [openEp, setOpenEp] = useState<any | null>(null);

  // Data fetching 
  const { data: eps = [], isLoading } = useEps(filters);

  // Mutations 
  const { mutate, isPending, variables } = useUpdateEp();
  const { mutate: transitionMutate, isPending: isTransitionPending, variables: transitionVariables } = useTransitionEp();

  // Track which EP ID is currently being mutated (for per-row pending state)
  const pendingId = (isPending && variables ? variables.id : null) || 
                    (isTransitionPending && transitionVariables ? transitionVariables.id : null);

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

  const handleTransition = useCallback(
    (id: string, targetProduct: string, note?: string) => {
      transitionMutate({ id, targetProduct, note });
    },
    [transitionMutate],
  );

  const leadsBadge = !isLoading ? (
    <Badge
      id="leads-processed-badge"
      variant="outline"
      className="text-xs font-semibold px-4 py-1.5 gap-2 bg-muted text-sidebar-primary border-transparent rounded-full shrink-0 w-fit"
    >
      <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
      {contactedCount}/{eps.length} Leads Contacted
    </Badge>
  ) : null;

  // Render 
  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="shrink-0 pl-4 pr-16 md:px-6 pt-4 md:pt-5 pb-3 bg-card">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">My CRM</p>

        <h1 className="text-3xl font-bold tracking-tight">My Assigned EPs</h1>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Manage and track your assigned EPs
          </p>

          {/* Desktop badge, vertically centered with the subtitle */}
          <div className="hidden md:block">
            {leadsBadge}
          </div>
        </div>

        {/* Mobile badge */}
        <div className="block md:hidden mt-2">
          {leadsBadge}
        </div>
      </div>
      {/* Filters */}
      <div className="shrink-0 px-4 md:px-6 py-3 bg-background border-b border-border/60">
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
          onTransition={handleTransition}
          onCommentClick={(ep) => setOpenEp(ep)}
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
          onCommentClick={(ep) => setOpenEp(ep)}
        />
      </div>

      {/* Comment side panel */}
      <CommentPanel
        ep={openEp}
        canComment={false} // Members can only view comments, not add them
        onClose={() => setOpenEp(null)}
      />
    </div>
  );
}
