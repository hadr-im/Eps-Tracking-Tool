// TeamCrmPage (Read-only CRM oversight for TL/VP)
// - Member picker to select whose EPs to view
// - Reuses EpTable with readOnly={true} (no edits possible)
// - Comments icon per row opens CommentPanel (side sheet)
// - Read-only banner is always visible

import { useState, useCallback } from 'react';
import { Eye, Plus, Minus, MessageSquare } from 'lucide-react';
import { useAuth }               from '@/hooks/useAuth';
import { useDepartmentMembers }  from '@/hooks/useDepartmentMembers';
import { useTeamEps }            from '@/hooks/useTeamEps';
import { useTransitionEp }       from '@/hooks/useTransitionEp';
import { MemberPicker }          from '@/components/team/MemberPicker';
import { CommentPanel }          from '@/components/team/CommentPanel';
import { EpTable }               from '@/components/crm/EpTable';
import { TransitionCell }        from '@/components/crm/cells/TransitionCell';
import { StatusBadgeCell }       from '@/components/crm/cells/StatusBadgeCell';
import { cn }                    from '@/lib/utils';
import type { Ep }               from '@/types/ep';

// No-op callbacks
const noop = () => {};
const noopCheckbox = () => {};
const noopPhase = () => {};

export default function TeamCrmPage() {
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? null;
  const canComment = user?.role === 'TEAM_LEADER' || user?.role === 'VP';

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [openEp, setOpenEp] = useState<Ep | null>(null);

  const { data: members = [], isLoading: membersLoading } = useDepartmentMembers(departmentId);
  const { data: eps = [], isLoading: epsLoading } = useTeamEps(selectedMemberId);
  const { mutate: transitionMutate, isPending: transitionPending, variables: transitionVariables } = useTransitionEp();

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const pendingId = transitionPending && transitionVariables ? transitionVariables.id : null;

  const handleCommentClick = useCallback((ep: Ep) => setOpenEp(ep), []);
  const handleTransition = useCallback((id: string, targetProduct: string) => {
    transitionMutate({ id, targetProduct });
  }, [transitionMutate]);

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="shrink-0 pl-4 pr-16 md:px-6 pt-4 md:pt-5 pb-3 bg-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Team CRM</p>
            <h1 className="text-3xl font-bold tracking-tight">Team Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Read-only view of a member's EP pipeline
            </p>
          </div>

          {/* Read-only badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-sidebar-primary px-3 py-1 text-xs font-semibold text-sidebar-primary-foreground">
            <Eye size={12} />
            Read-only
          </span>
        </div>
      </div>

      {/* Member picker bar */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background flex items-center gap-3 flex-wrap">
        <label htmlFor="member-picker" className="text-sm font-medium shrink-0">
          Viewing member:
        </label>
        <MemberPicker
          members={members}
          isLoading={membersLoading}
          selectedId={selectedMemberId}
          onSelect={setSelectedMemberId}
        />
        {selectedMember && (
          <span className="text-sm text-muted-foreground">
             {eps.length} EP{eps.length !== 1 ? 's' : ''} assigned
          </span>
        )}
      </div>

      {/* No member selected prompt */}
      {!selectedMemberId && !membersLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Select a member above to view their CRM data.
        </div>
      )}

      {/* Table (desktop only) */}
      {selectedMemberId && (
        <div className="hidden md:flex flex-col flex-1 min-h-0 px-4 md:px-6 py-4">
          <EpTable
            eps={eps}
            isLoading={epsLoading}
            pendingId={pendingId}
            readOnly
            onCheckboxUpdate={noopCheckbox}
            onPhaseUpdate={noopPhase}
            onTextUpdate={noop}
            onTransition={handleTransition}
            onCommentClick={canComment ? handleCommentClick : undefined}
          />
        </div>
      )}

      {/* Mobile fallback */}
      {selectedMemberId && (
        <div className="md:hidden flex-1 overflow-auto px-4 py-4">
          {epsLoading ? (
            <div className="text-sm text-muted-foreground text-center py-10">Loading…</div>
          ) : eps.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">No EPs found.</div>
          ) : (
            <ul className="space-y-3">
              {eps.map((ep) => (
                <TeamCrmMobileCard
                  key={ep.id}
                  ep={ep}
                  canComment={canComment}
                  onCommentClick={handleCommentClick}
                  onTransition={handleTransition}
                  isPending={pendingId === ep.id}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Comment side panel */}
      <CommentPanel
        ep={openEp}
        canComment={canComment}
        onClose={() => setOpenEp(null)}
      />
    </div>
  );
}

function TeamCrmMobileCard({
  ep,
  canComment,
  onCommentClick,
  onTransition,
  isPending,
}: {
  ep: Ep;
  canComment: boolean;
  onCommentClick: (ep: Ep) => void;
  onTransition: (epId: string, targetProduct: string) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="font-semibold text-sm truncate">{ep.fullName}</span>
          </div>
          <div className="shrink-0">
            <StatusBadgeCell status={ep.statusOnExpa} />
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 mt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground flex-1">
            <span>ID: <span className="text-foreground font-medium">{ep.id}</span></span>
            <span>Product: <span className="text-foreground font-medium">{ep.product}</span></span>
            <span>Phase: <span className="text-foreground font-medium">{ep.trackingPhase?.replace(/_/g, ' ') ?? '—'}</span></span>
            <span>Contacted: <span className="text-foreground font-medium">{ep.contacted ? 'Yes' : 'No'}</span></span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canComment && (
              <button
                type="button"
                onClick={() => onCommentClick(ep)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors p-1 rounded-md"
                aria-label={`Comments for ${ep.fullName}`}
              >
                <MessageSquare size={16} strokeWidth={1.6} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors p-1 rounded-md"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? <Minus size={18} /> : <Plus size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t px-4 py-3 bg-muted/10">
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">Transition</span>
              <TransitionCell
                epId={ep.id}
                currentProduct={ep.product}
                isPending={isPending}
                onTransition={onTransition}
              />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
