import { useState, useCallback, useMemo } from 'react';
import { useAuth }                   from '@/hooks/useAuth';
import { useEpsUnderProcess }        from '@/hooks/useEpsUnderProcess';
import type { UnderProcessFilters }  from '@/hooks/useEpsUnderProcess';
import { useDepartmentMembers }      from '@/hooks/useDepartmentMembers';
import { useTransitionEp }           from '@/hooks/useTransitionEp';
import { CommentPanel }              from '@/components/team/CommentPanel';
import { EpsUnderProcessTable }      from '@/components/under-process/EpsUnderProcessTable';
import { EpUnderProcessMobileCard }  from '@/components/under-process/EpUnderProcessMobileCard';
import { EpFilterBar }               from '@/components/filters/EpFilterBar';
import { FilterSelect }              from '@/components/filters/FilterSelect';
import { DateRangeFilter }           from '@/components/filters/DateRangeFilter';
import { SoftBadge }                 from '@/components/ui/soft-badge';
import { UNIVERSITIES, FIELDS_OF_STUDY } from '@/lib/options';
import type { Ep }                   from '@/types/ep';
import { PageHeader } from '@/components/layout/PageHeader';
import { isVpLevel } from '@/types/auth';

export default function EpsUnderProcessPage() {
  const { user } = useAuth();
  const canComment   = user?.role === 'TEAM_LEADER' || isVpLevel(user?.role);
  const departmentId = user?.departmentId ?? null;

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<UnderProcessFilters>({});
  const [openEp, setOpenEp] = useState<Ep | null>(null);

  const { data: eps = [],     isLoading: epsLoading }     = useEpsUnderProcess(filters);
  const { data: members = [], isLoading: membersLoading } = useDepartmentMembers(departmentId);
  const { mutate: transitionMutate, isPending: transitionPending, variables: transitionVariables } = useTransitionEp();

  const pendingId = transitionPending && transitionVariables ? transitionVariables.id : null;

  // Build ownerId → fullName map from the already-cached members list
  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.fullName])),
    [members],
  );

  // Client-side search by EP name 
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eps;
    return eps.filter(
      (ep) =>
        ep.fullName.toLowerCase().includes(q) ||
        ep.id.toLowerCase().includes(q),
    );
  }, [eps, search]);

  const handleCommentClick = useCallback((ep: Ep) => setOpenEp(ep), []);
  const handleTransition = useCallback((id: string, targetProduct: string) => {
    transitionMutate({ id, targetProduct });
  }, [transitionMutate]);

  const isLoading = epsLoading || membersLoading;

  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title="EPs Under Process"
        subtitle="EPs currently looking for an opportunity match"
        actions={
          !isLoading && (
            <SoftBadge tone="blue" className="px-3 py-1 text-xs">
              {filtered.length} EP{filtered.length !== 1 ? 's' : ''}
            </SoftBadge>
          )
        }
      />

      {/* Search & filters — same bar as every other list page */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <EpFilterBar
          idPrefix="under-process"
          search={search}
          onSearchChange={setSearch}
          placeholder="Search EP name or ID…"
          hasActiveFilters={Object.values(filters).some(Boolean)}
          onClearFilters={() => {
            setSearch('');
            setFilters({});
          }}
          filters={
            <>
              <FilterSelect
                value={filters.university}
                onChange={(v) => setFilters((f) => ({ ...f, university: v }))}
                options={UNIVERSITIES}
                allLabel="All universities"
                className="w-40"
              />
              <FilterSelect
                value={filters.fieldOfStudy}
                onChange={(v) => setFilters((f) => ({ ...f, fieldOfStudy: v }))}
                options={FIELDS_OF_STUDY}
                allLabel="All fields"
                className="w-36"
              />
              <DateRangeFilter
                from={filters.createdFrom}
                to={filters.createdTo}
                onChange={({ from, to }) =>
                  setFilters((f) => ({ ...f, createdFrom: from, createdTo: to }))
                }
              />
            </>
          }
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <EpsUnderProcessTable
          eps={filtered}
          memberMap={memberMap}
          isLoading={isLoading}
          onCommentClick={canComment ? handleCommentClick : undefined}
          onTransition={handleTransition}
          pendingId={pendingId}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex-1 overflow-auto px-4 py-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-10">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            {search ? 'No EPs match your search.' : 'No EPs are currently looking for opportunities.'}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((ep) => (
              <EpUnderProcessMobileCard
                key={ep.id}
                ep={ep}
                memberName={ep.ownerId ? (memberMap[ep.ownerId] ?? null) : null}
                canComment={canComment}
                onCommentClick={handleCommentClick}
                onTransition={handleTransition}
                isPending={pendingId === ep.id}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Shared comment side panel (reused from Team CRM) */}
      <CommentPanel
        ep={openEp}
        canComment={canComment}
        onClose={() => setOpenEp(null)}
      />
    </div>
  );
}
