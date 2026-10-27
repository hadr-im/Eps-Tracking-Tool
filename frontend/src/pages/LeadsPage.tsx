// Leads & Sign-ups pool for TL / VP oversight
// - All leads browsable by TL and VP
// - Dispatch button visible to Team Leaders and VPs
// - Server-side filtered (name search + product)
// - Dispatched rows disappear without a manual refresh (React Query cache invalidation)


import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth }          from '@/hooks/useAuth';
import { useLeads }         from '@/hooks/useLeads';
import { LeadFiltersBar }   from '@/components/leads/LeadFiltersBar';
import { LeadTable }        from '@/components/leads/LeadTable';
import { LeadCardList }     from '@/components/leads/LeadCardList';
import { DispatchDialog }   from '@/components/leads/DispatchDialog';
import { PaginationBar }    from '@/components/ui/pagination-bar';
import { SoftBadge }        from '@/components/ui/soft-badge';
import type { Lead, LeadFilters } from '@/types/lead';
import { PageHeader } from '@/components/layout/PageHeader';
import { isVpLevel } from '@/types/auth';

export default function LeadsPage() {
  const { user } = useAuth();

  // Team Leaders and VPs may assign leads; members can browse but not assign.
  const canDispatch = user?.role === 'TEAM_LEADER' || isVpLevel(user?.role);
  const departmentId = user?.departmentId ?? null;

  const [filters, setFilters] = useState<LeadFilters>({});
  const [page, setPage] = useState(1);

  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading } = useLeads(filters, page);
  const leads = data?.data ?? [];

  /*
    Selection survives paging, so the dispatch dialog has to be handed leads
    that are no longer on screen. Only ids are tracked by the table, and the
    row for a lead ticked three pages back is long gone from `leads` — this
    remembers the objects themselves as they are seen.

    A ref rather than state: it is written during the same commit that renders
    the rows, and nothing reads it except the dialog on open.
  */
  const seenLeads = useRef(new Map<string, Lead>());
  leads.forEach((l) => seenLeads.current.set(l.id, l));

  const selectedLeads = useMemo(
    () =>
      selectedLeadIds
        .map((id) => seenLeads.current.get(id))
        .filter((l): l is Lead => !!l),
    [selectedLeadIds],
  );

  /*
    Changing a filter re-scopes the result set, so the page the user is on may
    not exist any more — and a selection made against the old filters is no
    longer something they can see or reason about.
  */
  useEffect(() => {
    setPage(1);
    setSelectedLeadIds([]);
  }, [filters]);

  const handleDispatchClick = useCallback(() => {
    if (selectedLeadIds.length > 0) {
      setIsDialogOpen(true);
    }
  }, [selectedLeadIds]);

  const handleDialogClose = useCallback(() => setIsDialogOpen(false), []);

  const handleDispatchSuccess = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedLeadIds([]);
  }, []);

  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title="Leads & Sign-ups"
        subtitle="Unassigned EP pool for your department"
        actions={
          !isLoading && (
            <SoftBadge tone="blue" className="px-3 py-1 text-xs">
              {data?.total ?? 0} Lead{(data?.total ?? 0) !== 1 ? 's' : ''}
            </SoftBadge>
          )
        }
      />

      {/* Filters & Dispatch Action */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <LeadFiltersBar
          onFiltersChange={setFilters}
          canDispatch={canDispatch}
          selectedCount={selectedLeadIds.length}
          onDispatch={handleDispatchClick}
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <LeadTable
          leads={leads}
          isLoading={isLoading}
          canDispatch={canDispatch}
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex-1 overflow-auto px-4 py-4">
        <LeadCardList
          leads={leads}
          isLoading={isLoading}
          canDispatch={canDispatch}
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
        />
      </div>

      <PaginationBar
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        pageSize={data?.pageSize ?? 50}
        onPageChange={setPage}
        note={
          selectedLeadIds.length > 0 ? (
            <span className="font-medium text-foreground">
              · {selectedLeadIds.length} selected across all pages
            </span>
          ) : null
        }
      />

      {/* Dispatch modal */}
      <DispatchDialog
        open={isDialogOpen}
        leads={selectedLeads}
        departmentId={departmentId}
        onClose={handleDialogClose}
        onSuccess={handleDispatchSuccess}
      />
    </div>
  );
}
