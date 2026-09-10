import { useState, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { useAuth }              from '@/hooks/useAuth';
import { useApprovedEps }       from '@/hooks/useApprovedEps';
import { CommentPanel }         from '@/components/team/CommentPanel';
import { ApprovedEpsFilters }   from '@/components/approved/ApprovedEpsFilters';
import { ApprovedEpsTable }     from '@/components/approved/ApprovedEpsTable';
import { ApprovedEpMobileCard } from '@/components/approved/ApprovedEpMobileCard';
import type { ApprovedEp, ApprovedEpFilters as Filters } from '@/types/approvedEp';
import type { Ep } from '@/types/ep';

export default function ApprovedEpsPage() {
  const { user } = useAuth();
  const canComment = user?.role === 'TEAM_LEADER' || user?.role === 'VP';

  const [filters, setFilters] = useState<Filters>({});
  const [openEp, setOpenEp]   = useState<ApprovedEp | null>(null);

  const { data: eps = [], isLoading } = useApprovedEps(filters);

  const handleCommentClick = useCallback((ep: ApprovedEp) => setOpenEp(ep), []);

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="shrink-0 pl-4 pr-16 md:px-6 pt-4 md:pt-5 pb-3 bg-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Approved EPs</p>
            <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
            <p className="text-sm text-muted-foreground">
              Department-wide operational tracker
            </p>
          </div>

          {/* Read-only badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-sidebar-primary px-3 py-1 text-xs font-semibold text-sidebar-primary-foreground">
            <Eye size={12} />
            Read-only
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background">
        <ApprovedEpsFilters
          filters={filters}
          onChange={setFilters}
          totalCount={eps.length}
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
        <ApprovedEpsTable
          eps={eps}
          isLoading={isLoading}
          onCommentClick={canComment ? handleCommentClick : undefined}
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
