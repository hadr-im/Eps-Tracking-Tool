/*
  EPs that another department transitioned into this one.

  Rendered with the same table and card list as Manual Leads rather than a pair
  of bespoke ones. The three pools — dispatch, hand-entered and transitioned —
  are the same thing to the person using them: a list of unassigned EPs you
  tick and send to a member. Sharing the components is what keeps them from
  drifting into three different screens, and it is what retired the inline
  member picker the mobile cards used to carry, which was the last place in the
  app that assigned an EP without going through the dispatch dialog.
*/

import { useState, useMemo, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTransitions } from '@/hooks/useTransitions';
import { useAuth } from '@/hooks/useAuth';
import { LeadTable } from '@/components/leads/LeadTable';
import { LeadCardList } from '@/components/leads/LeadCardList';
import { DispatchDialog } from '@/components/leads/DispatchDialog';
import { EpFilterBar } from '@/components/filters/EpFilterBar';
import { FilterSelect } from '@/components/filters/FilterSelect';
import { Button } from '@/components/ui/button';
import { SoftBadge } from '@/components/ui/soft-badge';
import { PageHeader } from '@/components/layout/PageHeader';
import { UNIVERSITIES, FIELDS_OF_STUDY } from '@/lib/options';

export default function TransitionedEpsPage() {
  const { user } = useAuth();

  // Team Leaders and VPs can assign transitioned EPs to a member.
  const canAssign = user?.role === 'TEAM_LEADER' || user?.role === 'VP';

  const [search, setSearch] = useState('');
  const [university, setUniversity] = useState<string | undefined>();
  const [fieldOfStudy, setFieldOfStudy] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  const { data: transitions = [], isLoading } = useTransitions();

  /*
    Filtered client-side: a department receives a handful of transitions, so
    this is a short list and a round-trip per keystroke would be waste. The
    university match is a prefix test for the same reason the API uses one —
    the sign-up form has written each institution several ways.
  */
  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transitions
      .map((t) => t.ep)
      .filter((ep): ep is NonNullable<typeof ep> => !!ep)
      .filter((ep) => {
        if (q && !ep.fullName.toLowerCase().includes(q) && !ep.id.toLowerCase().includes(q)) {
          return false;
        }
        if (university && !(ep.university ?? '').toLowerCase().startsWith(university.toLowerCase())) {
          return false;
        }
        if (fieldOfStudy && ep.fieldOfStudy !== fieldOfStudy) {
          return false;
        }
        return true;
      });
  }, [transitions, search, university, fieldOfStudy]);

  // An Ep carries every field a Lead has, so the shared DispatchDialog and
  // LeadTable take these as-is.
  const selectedLeads = useMemo(
    () => leads.filter((ep) => selectedIds.includes(ep.id)),
    [leads, selectedIds],
  );

  const handleDispatchSuccess = useCallback(() => {
    setIsDispatchOpen(false);
    setSelectedIds([]);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Transitioned EPs"
        subtitle="EPs transitioned into your department"
        actions={
          !isLoading && (
            <SoftBadge tone="blue" className="px-3 py-1 text-xs">
              {leads.length} EP{leads.length !== 1 ? 's' : ''}
            </SoftBadge>
          )
        }
      />

      {/* Search & actions — same bar as Manual Leads */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <EpFilterBar
          idPrefix="transitions"
          search={search}
          onSearchChange={setSearch}
          placeholder="Search EP name or ID…"
          hasActiveFilters={!!(university || fieldOfStudy)}
          onClearFilters={() => {
            setSearch('');
            setUniversity(undefined);
            setFieldOfStudy(undefined);
          }}
          filters={
            <>
              <FilterSelect
                value={university}
                onChange={setUniversity}
                options={UNIVERSITIES}
                allLabel="All universities"
                className="w-40"
              />
              <FilterSelect
                value={fieldOfStudy}
                onChange={setFieldOfStudy}
                options={FIELDS_OF_STUDY}
                allLabel="All fields"
                className="w-36"
              />
            </>
          }
          actions={
            canAssign ? (
              <Button
                size="sm"
                onClick={() => setIsDispatchOpen(true)}
                disabled={selectedIds.length === 0}
                className="h-8 gap-1.5 text-xs"
              >
                Dispatch {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                <ChevronRight size={14} />
              </Button>
            ) : null
          }
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <LeadTable
          leads={leads}
          isLoading={isLoading}
          canDispatch={canAssign}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex-1 overflow-auto px-4 py-4">
        <LeadCardList
          leads={leads}
          isLoading={isLoading}
          canDispatch={canAssign}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
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
