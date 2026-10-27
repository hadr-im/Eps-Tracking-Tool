import { useState, useCallback, useEffect } from 'react';

import { useAuth }              from '@/hooks/useAuth';
import { useApprovedEps }       from '@/hooks/useApprovedEps';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { useReassignEpOwner }   from '@/hooks/useReassignEpOwner';
import { CommentPanel }         from '@/components/team/CommentPanel';
import { ApprovedEpsFilters }   from '@/components/approved/ApprovedEpsFilters';
import { ApprovedEpsTable }     from '@/components/approved/ApprovedEpsTable';
import { ApprovedEpMobileCard } from '@/components/approved/ApprovedEpMobileCard';
import { PaginationBar }        from '@/components/ui/pagination-bar';
import { SoftBadge }            from '@/components/ui/soft-badge';
import type { ApprovedEp, ApprovedEpFilters as Filters } from '@/types/approvedEp';
import type { Ep } from '@/types/ep';
import { PageHeader } from '@/components/layout/PageHeader';
import { isVpLevel } from '@/types/auth';

export default function ApprovedEpsPage() {
  const { user } = useAuth();
  const canComment = user?.role === 'TEAM_LEADER' || isVpLevel(user?.role);
  const canReassign = canComment;

  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage]       = useState(1);
  const [openEp, setOpenEp]   = useState<ApprovedEp | null>(null);

  const { data, isLoading } = useApprovedEps(filters, page);
  const eps = data?.data ?? [];

  // A new filter re-scopes the results, so the current page may no longer exist.
  useEffect(() => setPage(1), [filters]);
  const { data: departmentMembers = [] } = useDepartmentMembers(user?.departmentId ?? null);
  const { mutate: reassignOwner, variables: reassignVars, isPending: isReassigning } =
    useReassignEpOwner();

  const handleCommentClick = useCallback((ep: ApprovedEp) => setOpenEp(ep), []);
  const handleReassign = useCallback(
    (epId: string, memberId: string) => reassignOwner({ epId, memberId }),
    [reassignOwner],
  );
  const reassigningId = isReassigning ? reassignVars?.epId ?? null : null;

  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title="Approved EPs"
        subtitle="Department-wide operational tracker"
        actions={
          !isLoading && (
            <SoftBadge tone="blue" className="px-3 py-1 text-xs">
              {data?.total ?? 0} EP{(data?.total ?? 0) !== 1 ? 's' : ''}
            </SoftBadge>
          )
        }
      />

      {/* Filter bar */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <ApprovedEpsFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Desktop table */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <ApprovedEpsTable
          eps={eps}
          isLoading={isLoading}
          onCommentClick={canComment ? handleCommentClick : undefined}
          departmentMembers={canReassign ? departmentMembers : undefined}
          onReassign={canReassign ? handleReassign : undefined}
          reassigningId={reassigningId}
        />
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex-1 overflow-auto px-4 py-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-10">Loading…</div>
        ) : eps.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            No approved EPs found. Try adjusting your filters.
          </div>
        ) : (
          <ul className="space-y-3">
            {eps.map((ep) => (
              <ApprovedEpMobileCard
                key={ep.id}
                ep={ep}
                canComment={canComment}
                onCommentClick={handleCommentClick}
              />
            ))}
          </ul>
        )}
      </div>

      <PaginationBar
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        total={data?.total ?? 0}
        pageSize={data?.pageSize ?? 50}
        onPageChange={setPage}
      />

      {/* Shared comment side panel (reused from Team CRM) */}
      {/*
        CommentPanel expects type Ep but only reads ep.id + ep.fullName
        ApprovedEp carries both fields so casting to unknown -> Ep is safe
      */}
      <CommentPanel
        ep={openEp as unknown as Ep}
        canComment={canComment}
        onClose={() => setOpenEp(null)}
      />
    </div>
  );
}
