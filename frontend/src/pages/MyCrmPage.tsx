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
import type { EpFilters, TrackingPhase } from '@/types/ep';
import { PageHeader } from '@/components/layout/PageHeader';

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

  /*
    Progress, not a label. A bare "3/20" says little at a glance, so the count
    carries a bar underneath showing how far through the list you are.
  */
  const contactedPct = eps.length > 0 ? (contactedCount / eps.length) * 100 : 0;

  const leadsBadge = !isLoading ? (
    <div
      id="leads-processed-badge"
      className="flex flex-col gap-1.5 rounded-lg border bg-card px-3.5 py-2 min-w-46"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Leads contacted
        </span>
        <span className="text-xs font-bold tabular-nums">
          {contactedCount}
          <span className="text-muted-foreground font-medium">/{eps.length}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-aiesec-blue transition-all duration-300"
          style={{ width: `${contactedPct}%` }}
        />
      </div>
    </div>
  ) : null;

  // Render 
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="My Assigned EPs"
        subtitle="Manage and track your assigned EPs"
        actions={leadsBadge}
      />
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
