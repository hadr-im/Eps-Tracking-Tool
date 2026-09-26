// TeamCrmPage (Read-only CRM oversight for TL/VP)
// - Member picker to select whose EPs to view
// - Reuses EpTable with readOnly={true} (no edits possible)
// - Comments icon per row opens CommentPanel (side sheet)
// - Read-only banner is always visible

import { useState, useCallback } from 'react';
import {
  MessageSquare,
  User,
  GraduationCap,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Link2,
  CheckCircle2,
  Clock,
  Tag,
  StickyNote,
  Compass,
  Timer,
} from 'lucide-react';
import { useAuth }               from '@/hooks/useAuth';
import { useDepartmentMembers }  from '@/hooks/useDepartmentMembers';
import { useTeamEps }            from '@/hooks/useTeamEps';
import { MemberPicker }          from '@/components/team/MemberPicker';
import { CommentPanel }          from '@/components/team/CommentPanel';
import { EpTable }               from '@/components/crm/EpTable';
import { StatusBadgeCell }       from '@/components/crm/cells/StatusBadgeCell';
import {
  EpMobileCard,
  EpSection,
  EpInfoRow,
  EpBlockRow,
  formatEnum,
} from '@/components/crm/EpMobileCard';
import type { Ep }               from '@/types/ep';
import { PageHeader }            from '@/components/layout/PageHeader';

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

  const { data: allMembers = [], isLoading: membersLoading } = useDepartmentMembers(departmentId);

  // Only show MEMBER-role users — exclude TL and VP accounts
  const members = allMembers.filter((m) => m.role === 'MEMBER');
  const { data: eps = [], isLoading: epsLoading } = useTeamEps(selectedMemberId);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const handleCommentClick = useCallback((ep: Ep) => setOpenEp(ep), []);

  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title="Team Pipeline"
        subtitle="Read-only view of a member's EP pipeline"
      />

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
            pendingId={null}
            readOnly
            onCheckboxUpdate={noopCheckbox}
            onPhaseUpdate={noopPhase}
            onTextUpdate={noop}
            onTransition={undefined}
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

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

function TeamCrmMobileCard({
  ep,
  canComment,
  onCommentClick,
}: {
  ep: Ep;
  canComment: boolean;
  onCommentClick: (ep: Ep) => void;
}) {
  return (
    <EpMobileCard
      fullName={ep.fullName}
      id={ep.id}
      createdAt={ep.createdAtExpa}
      headerSub={<span>{ep.product}</span>}
      headerRight={<StatusBadgeCell status={ep.statusOnExpa} />}
      footer={
        canComment && (
          <button
            type="button"
            onClick={() => onCommentClick(ep)}
            className="inline-flex items-center gap-1.5 rounded-full border border-aiesec-blue/25 bg-aiesec-blue/10 px-3 py-1.5 text-[11px] font-semibold text-aiesec-blue hover:bg-aiesec-blue/15 transition-colors"
          >
            <MessageSquare size={13} strokeWidth={2.2} />
            View Comments
          </button>
        )
      }
    >
      <EpSection label="General Info" icon={User}>
        <EpInfoRow label="Email" icon={Mail} value={ep.email} />
        <EpInfoRow label="Phone" icon={Phone} value={ep.phone} />
        <EpInfoRow label="University" icon={GraduationCap} value={ep.university} />
        <EpInfoRow label="Field of Study" icon={BookOpen} value={ep.fieldOfStudy} />
        <EpInfoRow label="Year" value={ep.yearOfStudy} />
        <EpInfoRow label="Created on EXPA" icon={Calendar} value={formatDate(ep.createdAtExpa)} />
      </EpSection>

      <EpSection label="CRM" icon={Tag}>
        <EpInfoRow label="Source" value={ep.source} />
        <EpInfoRow
          label="CV Link"
          icon={Link2}
          value={
            ep.cvLink ? (
              <a
                href={ep.cvLink}
                target="_blank"
                rel="noreferrer"
                className="text-aiesec-blue underline break-all"
              >
                Open CV
              </a>
            ) : null
          }
        />
        <EpInfoRow label="Assigned At" icon={Calendar} value={formatDate(ep.assignedAt)} />
        <EpInfoRow label="Contacted" icon={CheckCircle2} value={ep.contacted ? 'Yes' : 'No'} />
        <EpInfoRow label="Contacted At" icon={Clock} value={formatDate(ep.contactedAt)} />
        <EpInfoRow label="Interested" icon={CheckCircle2} value={ep.interested ? 'Yes' : 'No'} />
        <EpInfoRow label="Tracking Phase" value={formatEnum(ep.trackingPhase)} />
        <EpBlockRow label="Notes" icon={StickyNote} value={ep.notes} />
      </EpSection>

      <EpSection label="Interests" icon={Compass}>
        <EpInfoRow label="Duration" icon={Timer} value={formatEnum(ep.duration)} />
        <EpInfoRow label="Availability" value={formatEnum(ep.availability)} />
      </EpSection>
    </EpMobileCard>
  );
}
