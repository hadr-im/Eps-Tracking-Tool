// TeamCrmPage (Read-only CRM oversight for TL/VP)
// - Member picker to select whose EPs to view
// - Reuses EpTable with readOnly={true} (no edits possible)
// - Comments icon per row opens CommentPanel (side sheet)
// - Read-only banner is always visible

import { useState, useCallback, useEffect } from 'react';
import { PaginationBar } from '@/components/ui/pagination-bar';
import {
  MessageSquare,
  User,
  Users,
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
import { isVpLevel } from '@/types/auth';
import { useEpsCount } from '@/hooks/useEpsCount';

// No-op callbacks
const noop = () => {};
const noopCheckbox = () => {};
const noopPhase = () => {};

export default function TeamCrmPage() {
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? null;
  const canComment = user?.role === 'TEAM_LEADER' || isVpLevel(user?.role);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [openEp, setOpenEp] = useState<Ep | null>(null);

  const { data: allMembers = [], isLoading: membersLoading } = useDepartmentMembers(departmentId);

  /*
    Members and Team Leaders, never VP accounts.

    Team Leaders carry their own EPs, so leaving them out hid part of the
    department's work from this page. They used to be listed for a VP only;
    they are listed for a Team Leader too now, which is everyone who can open
    this page at all.

    The viewer is dropped from their own list: this is a read-only view of
    someone else's pipeline, and a Team Leader finding their own name here
    would land them in a version of My CRM they cannot edit.
  */
  const members = allMembers.filter(
    (m) => (m.role === 'MEMBER' || m.role === 'TEAM_LEADER') && m.id !== user?.id,
  );
  const [page, setPage] = useState(1);
  const { data, isLoading: epsLoading } = useTeamEps(selectedMemberId, {}, page);
  const eps = data?.data ?? [];

  // Switching member swaps the whole list, so start from the top.
  useEffect(() => setPage(1), [selectedMemberId]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const handleCommentClick = useCallback((ep: Ep) => setOpenEp(ep), []);

  /*
    The same progress badge My CRM carries, for whoever is being looked at.

    Counted server-side over the member's whole list rather than the page on
    screen — counting the rows here would turn "12 of 200 contacted" into
    "12 of 50", which reads as a member falling behind when they are not.
  */
  const totalCount = data?.total ?? 0;
  const contactedCount = useEpsCount(
    { memberId: selectedMemberId ?? undefined, contacted: 'true' },
    !!selectedMemberId,
  );
  const contactedPct = totalCount > 0 ? (contactedCount / totalCount) * 100 : 0;

  const leadsBadge =
    selectedMemberId && !epsLoading ? (
      <div className="flex flex-col gap-1.5 rounded-lg border bg-card px-3.5 py-2 min-w-46">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Leads contacted
          </span>
          <span className="text-xs font-bold tabular-nums">
            {contactedCount}
            <span className="text-muted-foreground font-medium">/{totalCount}</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-aiesec-blue transition-all duration-300"
            style={{ width: `${contactedPct}%` }}
          />
        </div>
      </div>
    ) : null;

  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title="Team Pipeline"
        subtitle="Read-only view of a member's EP pipeline"
        actions={leadsBadge}
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
             {data?.total ?? 0} EP{(data?.total ?? 0) !== 1 ? 's' : ''} assigned
          </span>
        )}
      </div>

      {/*
        No member picked yet.

        The text was an anonymous flex child, so it stretched the full width
        and wrapped — which left `justify-center` nothing to centre and the
        two lines hard against the left edge of the phone, under a tall blank
        space that read as a page that had failed to load. It is a proper
        empty state now: an icon to fill the void, a bounded, centred column,
        and padding so it is never flush with the screen edge.
      */}
      {!selectedMemberId && !membersLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <Users size={36} className="text-muted-foreground/30" strokeWidth={1.5} />
          <p className="max-w-xs text-sm text-muted-foreground">
            Pick a member above to see the EPs they are working on.
          </p>
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

      {selectedMemberId && (
        <PaginationBar
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          total={data?.total ?? 0}
          pageSize={data?.pageSize ?? 50}
          onPageChange={setPage}
        />
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
