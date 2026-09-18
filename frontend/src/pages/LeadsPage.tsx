// Leads & Sign-ups pool for TL / VP oversight
// - All leads browsable by TL and VP
// - Dispatch button visible only for isDispatcher TLs
// - Server-side filtered (name search + product)
// - Dispatched rows disappear without a manual refresh (React Query cache invalidation)


import { useState, useCallback, useMemo } from 'react';
import { ChevronRight }     from 'lucide-react';
import { useAuth }          from '@/hooks/useAuth';
import { useLeads }         from '@/hooks/useLeads';
import { LeadFiltersBar }   from '@/components/leads/LeadFiltersBar';
import { LeadTable }        from '@/components/leads/LeadTable';
import { LeadCardList }     from '@/components/leads/LeadCardList';
import { DispatchDialog }   from '@/components/leads/DispatchDialog';
import { Badge }            from '@/components/ui/badge';
import { Button }           from '@/components/ui/button';
import type { LeadFilters } from '@/types/lead';

export default function LeadsPage() {
  const { user } = useAuth();

  // Only dispatcher TLs may trigger a dispatch (VPs and non dispatcher TLs can browse but not assign)
  const canDispatch = user?.isDispatcher === true;
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
              <span className="text-sm font-semibold">{leads.length}</span>
              <span>Lead{leads.length !== 1 ? 's' : ''}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Filters & Dispatch Action */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <LeadFiltersBar 
          onFiltersChange={setFilters} 
          dispatchButton={
            canDispatch ? (
              <Button
                size="sm"
                onClick={handleDispatchClick}
                disabled={selectedLeadIds.length === 0}
                className="h-8 gap-1.5 text-xs ml-1"
              >
                Dispatch {selectedLeadIds.length > 0 ? `(${selectedLeadIds.length})` : ''}
                <ChevronRight size={14} className="ml-1" />
              </Button>
            ) : undefined
          }
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
