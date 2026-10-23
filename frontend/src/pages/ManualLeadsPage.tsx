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
import { PageHeader } from '@/components/layout/PageHeader';

export default function ManualLeadsPage() {
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? null;

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: leads = [], isLoading } = useManualLeads();

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

      {/* Actions */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus /> Add lead
        </Button>

        {selectedLeadIds.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setIsDispatchOpen(true)}>
            Dispatch {selectedLeadIds.length}
          </Button>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:block flex-1 min-h-0 px-6 py-6 overflow-auto">
        <LeadTable
          leads={leads}
          isLoading={isLoading}
          canDispatch
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
        />
      </div>

      {/* Mobile */}
      <div className="md:hidden flex-1 min-h-0 px-4 py-4 overflow-auto">
        <LeadCardList
          leads={leads}
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
