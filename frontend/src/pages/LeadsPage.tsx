// Leads & Sign-ups pool for TL / VP oversight
// - All leads browsable by TL and VP
// - Dispatch button visible to Team Leaders and VPs
// - Server-side filtered (name search + product)
// - Dispatched rows disappear without a manual refresh (React Query cache invalidation)


import { useState, useCallback, useMemo } from 'react';
import { useAuth }          from '@/hooks/useAuth';
import { useLeads }         from '@/hooks/useLeads';
import { LeadFiltersBar }   from '@/components/leads/LeadFiltersBar';
import { LeadTable }        from '@/components/leads/LeadTable';
import { LeadCardList }     from '@/components/leads/LeadCardList';
import { DispatchDialog }   from '@/components/leads/DispatchDialog';
import { SoftBadge }        from '@/components/ui/soft-badge';
import type { LeadFilters } from '@/types/lead';
import { PageHeader } from '@/components/layout/PageHeader';

export default function LeadsPage() {
  const { user } = useAuth();

  // Team Leaders and VPs may assign leads; members can browse but not assign.
  const canDispatch = user?.role === 'TEAM_LEADER' || user?.role === 'VP';
  const departmentId = user?.departmentId ?? null;

  const [filters, setFilters] = useState<LeadFilters>({});
  
  // Selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: leads = [], isLoading } = useLeads(filters);

  // Compute selected Lead objects for the dialog
  const selectedLeads = useMemo(
    () => leads.filter((l) => selectedLeadIds.includes(l.id)),
    [leads, selectedLeadIds]
  );

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
              {leads.length} Lead{leads.length !== 1 ? 's' : ''}
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
