// EpUnderProcessMobileCard — same shared shell as every other mobile EP card.

import {
  MessageSquare,
  ExternalLink,
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Tag,
  CheckCircle2,
  Clock,
  Calendar,
  StickyNote,
  Compass,
  Timer,
} from 'lucide-react';
import { TransitionCell } from '@/components/crm/cells/TransitionCell';
import { StatusBadgeCell } from '@/components/crm/cells/StatusBadgeCell';
import { DateCell } from '@/components/crm/cells/DateCell';
import {
  EpMobileCard,
  EpSection,
  EpInfoRow,
  EpBlockRow,
  formatEnum,
} from '@/components/crm/EpMobileCard';
import type { Ep } from '@/types/ep';

interface EpUnderProcessMobileCardProps {
  ep: Ep;
  memberName: string | null;
  canComment: boolean;
  onCommentClick: (ep: Ep) => void;
  onTransition?: (epId: string, targetProduct: string) => void;
  isPending?: boolean;
}

function CvLink({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-aiesec-blue hover:underline"
    >
      Open CV
      <ExternalLink size={10} />
    </a>
  );
}

export function EpUnderProcessMobileCard({
  ep,
  memberName,
  canComment,
  onCommentClick,
  onTransition,
  isPending = false,
}: EpUnderProcessMobileCardProps) {
  return (
    <EpMobileCard
      fullName={ep.fullName}
      id={ep.id}
      createdAt={ep.createdAtExpa}
      headerSub={<span>{ep.product}</span>}
      headerRight={<StatusBadgeCell status={ep.statusOnExpa} />}
      footer={
        <div className="flex items-center justify-between gap-3">
          {canComment ? (
            <button
              type="button"
              onClick={() => onCommentClick(ep)}
              className="inline-flex items-center gap-1.5 rounded-full border border-aiesec-blue/25 bg-aiesec-blue/10 px-3 py-1.5 text-[11px] font-semibold text-aiesec-blue hover:bg-aiesec-blue/15 transition-colors"
            >
              <MessageSquare size={13} strokeWidth={2.2} />
              View Comments
            </button>
          ) : (
            <span />
          )}
          {onTransition && (
            <TransitionCell
              epId={ep.id}
              currentProduct={ep.product}
              isPending={isPending}
              onTransition={onTransition}
            />
          )}
        </div>
      }
    >
      <EpSection label="Contact" icon={User}>
        <EpInfoRow label="Member" icon={User} value={memberName} />
        <EpInfoRow label="Email" icon={Mail} value={ep.email} />
        <EpInfoRow label="Phone" icon={Phone} value={ep.phone} />
      </EpSection>

      <EpSection label="Academic" icon={GraduationCap}>
        <EpInfoRow label="University" icon={GraduationCap} value={ep.university} />
        <EpInfoRow label="Field of Study" icon={BookOpen} value={ep.fieldOfStudy} />
        <EpInfoRow label="Year" value={ep.yearOfStudy} />
      </EpSection>

      <EpSection label="CRM" icon={Tag}>
        <EpInfoRow label="Source" value={ep.source} />
        <EpInfoRow label="CV Link" icon={ExternalLink} value={<CvLink href={ep.cvLink} />} />
        <EpInfoRow label="Tracking Phase" value={formatEnum(ep.trackingPhase)} />
        <EpInfoRow label="Contacted" icon={CheckCircle2} value={ep.contacted ? 'Yes' : 'No'} />
        <EpInfoRow label="Interested" icon={CheckCircle2} value={ep.interested ? 'Yes' : 'No'} />
        <EpInfoRow label="Contacted At" icon={Clock} value={ep.contactedAt ? <DateCell value={ep.contactedAt} /> : null} />
        <EpInfoRow label="Assigned At" icon={Calendar} value={ep.assignedAt ? <DateCell value={ep.assignedAt} /> : null} />
        <EpBlockRow label="Notes" icon={StickyNote} value={ep.notes} />
      </EpSection>

      <EpSection label="Interests" icon={Compass}>
        <EpInfoRow label="Duration" icon={Timer} value={formatEnum(ep.duration)} />
        <EpInfoRow label="Availability" value={formatEnum(ep.availability)} />
      </EpSection>
    </EpMobileCard>
  );
}
