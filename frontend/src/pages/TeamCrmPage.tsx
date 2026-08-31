// TeamCrmPage (Read-only CRM oversight for TL/VP)
// - Member picker to select whose EPs to view
// - Reuses EpTable with readOnly={true} (no edits possible)
// - Comments icon per row opens CommentPanel (side sheet)
// - Read-only banner is always visible

import { useState, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { useAuth }               from '@/hooks/useAuth';
import { useDepartmentMembers }  from '@/hooks/useDepartmentMembers';
import { useTeamEps }            from '@/hooks/useTeamEps';
import { MemberPicker }          from '@/components/team/MemberPicker';
import { CommentPanel }          from '@/components/team/CommentPanel';
import { EpTable }               from '@/components/crm/EpTable';
import type { Ep }               from '@/types/ep';

// No-op callbacks: EpTable requires these even in readOnly mode (the cells are rendered as plain text, but the prop contract still exists)
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

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const handleCommentClick = useCallback((ep: Ep) => setOpenEp(ep), []);

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="shrink-0 px-4 md:px-6 pt-5 pb-3 border-b bg-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Team CRM</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Read-only view of a member's EP pipeline
            </p>
          </div>

          {/* Read-only badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-[var(--sidebar-primary)] px-3 py-1 text-xs font-semibold text-[var(--sidebar-primary-foreground)]">
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
            — {eps.length} EP{eps.length !== 1 ? 's' : ''} assigned
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
            pendingId={null}
            readOnly
            onCheckboxUpdate={noopCheckbox}
            onPhaseUpdate={noopPhase}
            onTextUpdate={noop}
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
                <li
                  key={ep.id}
                  className="rounded-xl border bg-card p-4 space-y-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{ep.fullName}</span>
                    {canComment && (
                      <button
                        type="button"
                        onClick={() => setOpenEp(ep)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="View comments"
                      >
                        💬
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Status: <span className="text-foreground">{ep.statusOnExpa}</span></p>
                    <p>Phase: <span className="text-foreground">{ep.trackingPhase?.replace(/_/g, ' ') ?? '—'}</span></p>
                    <p>Contacted: <span className="text-foreground">{ep.contacted ? 'Yes' : 'No'}</span></p>
                  </div>
                </li>
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
