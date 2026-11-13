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
import { MultiFilterSelect } from '@/components/filters/MultiFilterSelect';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { UNIVERSITIES, FIELDS_OF_STUDY, YEARS_OF_STUDY } from '@/lib/options';
import { isVpLevel } from '@/types/auth';

export default function TransitionedEpsPage() {
  const { user } = useAuth();

  // Team Leaders and VPs can assign transitioned EPs to a member.
  const canAssign = user?.role === 'TEAM_LEADER' || isVpLevel(user?.role);

  const [search, setSearch] = useState('');
  const [university, setUniversity] = useState<string | undefined>();
  const [fieldOfStudy, setFieldOfStudy] = useState<string | undefined>();
  const [yearOfStudy, setYearOfStudy] = useState<string | undefined>();
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [signedUpFrom, setSignedUpFrom] = useState<string | undefined>();
  const [signedUpTo, setSignedUpTo] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  const { data: transitions = [], isLoading } = useTransitions();

  // Who a transitioned EP can be handed to, for the member filter.
  const { data: members = [] } = useDepartmentMembers(user?.departmentId ?? null);
  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: m.fullName })),
    [members],
  );

  /*
    Filtered client-side: a department receives a handful of transitions, so
    this is a short list and a round-trip per keystroke would be waste. The
    university match is a prefix test for the same reason the API uses one —
    the sign-up form has written each institution several ways.
  */
  const leads = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transitions
      /*
        memberName is a property of the transition, not of the EP inside it,
        so mapping straight to `t.ep` dropped it. The table then showed
        "Unassigned" on a row that had just been dispatched and no longer had
        a checkbox — which reads as a broken row rather than a handled one.
      */
      .map((t) => (t.ep ? { ...t.ep, memberName: t.memberName ?? null } : null))
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
        if (yearOfStudy && String(ep.yearOfStudy ?? '') !== yearOfStudy) {
          return false;
        }
        // Empty means no constraint, not "nobody".
        if (ownerIds.length > 0 && !ownerIds.includes(ep.ownerId ?? '')) {
          return false;
        }
        /*
          The Created column is the EXPA sign-up date, so this filters on that
          rather than on when the transition happened. Compared as plain
          YYYY-MM-DD strings, which keeps the upper bound inclusive without
          having to reason about the end of the day in local time.
        */
        const signedUp = (ep.createdAtExpa ?? '').slice(0, 10);
        if (signedUpFrom && signedUp < signedUpFrom) return false;
        if (signedUpTo && signedUp > signedUpTo) return false;

        return true;
      });
  }, [transitions, search, university, fieldOfStudy, yearOfStudy, ownerIds, signedUpFrom, signedUpTo]);

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
          hasActiveFilters={
            !!(university || fieldOfStudy || yearOfStudy || signedUpFrom || signedUpTo) ||
            ownerIds.length > 0
          }
          onClearFilters={() => {
            setSearch('');
            setUniversity(undefined);
            setFieldOfStudy(undefined);
            setYearOfStudy(undefined);
            setOwnerIds([]);
            setSignedUpFrom(undefined);
            setSignedUpTo(undefined);
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
              <FilterSelect
                value={yearOfStudy}
                onChange={setYearOfStudy}
                options={YEARS_OF_STUDY}
                allLabel="All years"
                className="w-28"
              />
              <MultiFilterSelect
                values={ownerIds}
                onChange={setOwnerIds}
                options={memberOptions}
                allLabel="All members"
                className="w-36"
              />
              <DateRangeFilter
                from={signedUpFrom}
                to={signedUpTo}
                onChange={({ from, to }) => { setSignedUpFrom(from); setSignedUpTo(to); }}
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
