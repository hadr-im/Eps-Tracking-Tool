// Manually added leads — the counterpart to the Dispatch page.
//
// These are EPs entered by hand rather than fetched by the EXPA sync, so they
// never appear in the normal dispatch pool. Assignment works identically: pick
// rows, dispatch them to a member, and they drop off this list.

import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useManualLeads } from '@/hooks/useManualLeads';
import { LeadTable } from '@/components/leads/LeadTable';
import { LeadCardList } from '@/components/leads/LeadCardList';
import { DispatchDialog } from '@/components/leads/DispatchDialog';
import { AddManualLeadDialog } from '@/components/manual-leads/AddManualLeadDialog';
import { SoftBadge } from '@/components/ui/soft-badge';
import { Button } from '@/components/ui/button';
import { LeadsToolbar } from '@/components/leads/LeadsToolbar';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ManualLeadsPage() {
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? null;

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: leads = [], isLoading } = useManualLeads();

  // Filtered client-side: this list is the department's hand-entered leads,
  // which is a short list, so a round-trip per keystroke would be wasteful.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.fullName.toLowerCase().includes(q) ||
        (l.expaId ?? '').toLowerCase().includes(q),
    );
  }, [leads, search]);

  const selectedLeads = useMemo(
    () => leads.filter((l) => selectedLeadIds.includes(l.id)),
    [leads, selectedLeadIds],
  );

  const handleDispatchSuccess = useCallback(() => {
    setIsDispatchOpen(false);
    setSelectedLeadIds([]);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Manual Leads"
        subtitle="Leads you added by hand, waiting to be assigned"
        actions={
          !isLoading && (
            <SoftBadge tone="blue" className="px-3 py-1 text-xs">
              {leads.length} Lead{leads.length !== 1 ? 's' : ''}
            </SoftBadge>
          )
        }
      />

      {/* Search & actions — same bar as Dispatch */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <LeadsToolbar
          idPrefix="manual-leads"
          search={search}
          onSearchChange={setSearch}
          canDispatch
          selectedCount={selectedLeadIds.length}
          onDispatch={() => setIsDispatchOpen(true)}
          actions={
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setIsAddOpen(true)}>
              <Plus size={14} /> Add lead
            </Button>
          }
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <LeadTable
          leads={filtered}
          isLoading={isLoading}
          canDispatch
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex-1 overflow-auto px-4 py-4">
        <LeadCardList
          leads={filtered}
          isLoading={isLoading}
          canDispatch
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
        />
      </div>

      <AddManualLeadDialog open={isAddOpen} onClose={() => setIsAddOpen(false)} />

      <DispatchDialog
        open={isDispatchOpen}
        leads={selectedLeads}
        departmentId={departmentId}
        onClose={() => setIsDispatchOpen(false)}
        onSuccess={handleDispatchSuccess}
      />
    </div>
  );
}
