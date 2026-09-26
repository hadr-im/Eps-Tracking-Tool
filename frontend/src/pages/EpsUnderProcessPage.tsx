import { useState, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useAuth }                   from '@/hooks/useAuth';
import { useEpsUnderProcess }        from '@/hooks/useEpsUnderProcess';
import { useDepartmentMembers }      from '@/hooks/useDepartmentMembers';
import { useTransitionEp }           from '@/hooks/useTransitionEp';
import { CommentPanel }              from '@/components/team/CommentPanel';
import { EpsUnderProcessTable }      from '@/components/under-process/EpsUnderProcessTable';
import { EpUnderProcessMobileCard }  from '@/components/under-process/EpUnderProcessMobileCard';
import { Input }                     from '@/components/ui/input';
import { Button }                    from '@/components/ui/button';
import { cn }                        from '@/lib/utils';
import type { Ep }                   from '@/types/ep';
import { PageHeader } from '@/components/layout/PageHeader';

export default function EpsUnderProcessPage() {
  const { user } = useAuth();
  const canComment   = user?.role === 'TEAM_LEADER' || user?.role === 'VP';
  const departmentId = user?.departmentId ?? null;

  const [search, setSearch] = useState('');
  const [openEp, setOpenEp] = useState<Ep | null>(null);

  const { data: eps = [],     isLoading: epsLoading }     = useEpsUnderProcess();
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
      />

      {/* Search + count bar */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            id="under-process-search"
            type="search"
            placeholder="Search EP name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-xs border-0"
            aria-label="Search EPs under process"
          />
        </div>
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden flex items-center",
            search ? "w-8 opacity-100 ml-1" : "w-0 opacity-0 ml-0"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            title="Clear search"
            tabIndex={search ? 0 : -1}
          >
            <X size={16} />
          </Button>
        </div>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">
          {filtered.length} EP{filtered.length !== 1 ? 's' : ''}
        </span>
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
