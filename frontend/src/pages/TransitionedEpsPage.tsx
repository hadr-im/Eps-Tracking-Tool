import { useState, useMemo, useCallback } from 'react';
import { useTransitions } from '@/hooks/useTransitions';
import { useAuth } from '@/hooks/useAuth';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { useDispatch } from '@/hooks/useDispatch';
import { TransitionedEpsTable } from '@/components/transitions/TransitionedEpsTable';
import { TransitionedEpsCardList } from '@/components/transitions/TransitionedEpsCardList';
import { DispatchDialog } from '@/components/leads/DispatchDialog';
import { LeadsToolbar } from '@/components/leads/LeadsToolbar';
import { SoftBadge } from '@/components/ui/soft-badge';
import { PageHeader } from '@/components/layout/PageHeader';

export default function TransitionedEpsPage() {
  const { user } = useAuth();

  // Team Leaders and VPs can assign transitioned EPs to a member.
  const canAssign = user?.role === 'TEAM_LEADER' || user?.role === 'VP';
  const [search, setSearch] = useState('');
  
  const { data: transitions = [], isLoading } = useTransitions();
  const { data: members = [] } = useDepartmentMembers(user?.departmentId ?? null);
  const { mutate: dispatchMutate, isPending: isAssigning, variables: dispatchVariables } = useDispatch();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transitions;
    return transitions.filter(
      (t) =>
        t.ep?.fullName.toLowerCase().includes(q) ||
        t.ep?.id.toLowerCase().includes(q),
    );
  }, [transitions, search]);

  /*
    Selection drives a single Dispatch button in the toolbar, the same shape as
    the Dispatch page: tick rows, dispatch the batch. Assigning goes through
    the shared DispatchDialog so there is one way to assign a lead anywhere in
    the app.
  */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  // An Ep carries every field a Lead has, so the shared DispatchDialog takes
  // these as-is.
  const selectedLeads = useMemo(
    () =>
      filtered
        .map((t) => t.ep)
        .filter((ep): ep is NonNullable<typeof ep> => !!ep && selectedIds.includes(ep.id)),
    [filtered, selectedIds],
  );

  const handleDispatchSuccess = useCallback(() => {
    setIsDispatchOpen(false);
    setSelectedIds([]);
  }, []);

  const isAssigningId = isAssigning && dispatchVariables ? dispatchVariables.epIds[0] : null;

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Transitioned EPs"
        subtitle="EPs transitioned into your department"
        actions={
          !isLoading && (
            <SoftBadge tone="blue" className="px-3 py-1 text-xs">
              {filtered.length} EP{filtered.length !== 1 ? 's' : ''}
            </SoftBadge>
          )
        }
      />

      {/* Search & dispatch — same bar as Dispatch */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <LeadsToolbar
          idPrefix="transitions"
          search={search}
          onSearchChange={setSearch}
          placeholder="Search EP name or ID…"
          canDispatch={canAssign}
          selectedCount={selectedIds.length}
          onDispatch={() => setIsDispatchOpen(true)}
        />
      </div>

      {/* Desktop Content */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <TransitionedEpsTable
          transitions={filtered}
          isLoading={isLoading}
          canDispatch={canAssign}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* Mobile Content */}
      <div className="md:hidden flex-1 overflow-auto px-4 py-4">
        <TransitionedEpsCardList
          transitions={filtered}
          isLoading={isLoading}
          departmentMembers={members}
          onAssignEp={canAssign ? (epId, memberId) => dispatchMutate({ epIds: [epId], memberId }) : undefined}
          isAssigningId={isAssigningId}
        />
      </div>

      <DispatchDialog
        open={isDispatchOpen}
        leads={selectedLeads}
        departmentId={user?.departmentId ?? null}
        onClose={() => setIsDispatchOpen(false)}
        onSuccess={handleDispatchSuccess}
      />
    </div>
  );
}