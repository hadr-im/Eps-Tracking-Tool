// Leads & Sign-ups pool for TL / VP oversight
// - All leads browsable by TL and VP
// - Dispatch button visible only for isDispatcher TLs
// - Server-side filtered (name search + product)
// - Dispatched rows disappear without a manual refresh (React Query cache invalidation)


import { useState, useCallback } from 'react';
import { useAuth }          from '@/hooks/useAuth';
import { useLeads }         from '@/hooks/useLeads';
import { LeadFiltersBar }   from '@/components/leads/LeadFiltersBar';
import { LeadTable }        from '@/components/leads/LeadTable';
import { LeadCardList }     from '@/components/leads/LeadCardList';
import { DispatchDialog }   from '@/components/leads/DispatchDialog';
import { Badge }            from '@/components/ui/badge';
import type { Lead, LeadFilters } from '@/types/lead';

export default function LeadsPage() {
  const { user } = useAuth();

  // Only dispatcher TLs may trigger a dispatch (VPs and non dispatcher TLs can browse but not assign)
  const canDispatch = user?.isDispatcher === true;
  const departmentId = user?.departmentId ?? null;

  const [filters, setFilters] = useState<LeadFilters>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useLeads(filters);

  const handleDispatchClick = useCallback((lead: Lead) => setSelectedLead(lead), []);
  const handleDialogClose   = useCallback(() => setSelectedLead(null), []);

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="shrink-0 pl-4 pr-16 md:px-6 pt-4 md:pt-5 pb-3 bg-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dispatch</p>
            <h1 className="text-3xl font-bold tracking-tight">Leads &amp; Sign-ups</h1>
            <p className="text-sm text-muted-foreground">
              Unassigned EP pool for your department
            </p>
          </div>

          {/* Total count badge */}
          {!isLoading && (
            <Badge
              id="leads-count-badge"
              variant="outline"
              className="text-sm font-semibold px-3 py-1 gap-1.5 bg-sidebar-primary text-sidebar-primary-foreground border-transparent"
            >
              <span className="text-base font-bold">{leads.length}</span>
              <span>Lead{leads.length !== 1 ? 's' : ''}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <LeadFiltersBar onFiltersChange={setFilters} />
      </div>

      {/* Desktop table */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <LeadTable
          leads={leads}
          isLoading={isLoading}
          canDispatch={canDispatch}
          onDispatch={handleDispatchClick}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex-1 overflow-auto px-4 py-4">
        <LeadCardList
          leads={leads}
          isLoading={isLoading}
          canDispatch={canDispatch}
          onDispatch={handleDispatchClick}
        />
      </div>

      {/* Dispatch modal */}
      <DispatchDialog
        lead={selectedLead}
        departmentId={departmentId}
        onClose={handleDialogClose}
      />
    </div>
  );
}
