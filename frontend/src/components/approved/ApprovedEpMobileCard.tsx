// ApprovedEpMobileCard — unified with the shared EpMobileCard shell so every
// EP page's mobile view reads the same way.

import {
  MessageSquare,
  User,
  Phone,
  Building,
  MapPin,
  Briefcase,
  Hash,
  Calendar,
} from 'lucide-react';
import { StatusBadgeCell } from '@/components/crm/cells/StatusBadgeCell';
import { DateCell }        from '@/components/crm/cells/DateCell';
import {
  EpMobileCard,
  EpSection,
  EpInfoRow,
} from '@/components/crm/EpMobileCard';
import type { ApprovedEp } from '@/types/approvedEp';
import type { EpStatus }   from '@/types/ep';

interface ApprovedEpMobileCardProps {
  ep: ApprovedEp;
  canComment: boolean;
  onCommentClick: (ep: ApprovedEp) => void;
}

export function ApprovedEpMobileCard({ ep, canComment, onCommentClick }: ApprovedEpMobileCardProps) {
  const d = ep.approvedDetail;

  return (
    <EpMobileCard
      fullName={ep.fullName}
      id={ep.id}
      createdAt={ep.createdAtExpa}
      headerSub={<span>{ep.product}</span>}
      headerRight={<StatusBadgeCell status={ep.statusOnExpa as EpStatus} />}
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
      <EpSection label="Contact" icon={User}>
        <EpInfoRow label="Member" icon={User} value={ep.memberName} />
        <EpInfoRow label="Phone" icon={Phone} value={ep.phone} />
      </EpSection>

      <EpSection label="Opportunity" icon={Briefcase}>
        <EpInfoRow label="Opportunity" icon={Briefcase} value={d?.opportunityTitle} />
        <EpInfoRow label="App ID" icon={Hash} value={d?.expaAppId} />
      </EpSection>

      <EpSection label="Hosting" icon={MapPin}>
        <EpInfoRow label="Hosting MC" icon={Building} value={d?.hostingMC} />
        <EpInfoRow label="Hosting LC" icon={MapPin} value={d?.hostingLC} />
      </EpSection>

      <EpSection label="Timeline" icon={Calendar}>
        <EpInfoRow label="Approval" icon={Calendar} value={d?.approvalDate ? <DateCell value={d.approvalDate} /> : null} />
        <EpInfoRow label="Realized" icon={Calendar} value={d?.realizedDate ? <DateCell value={d.realizedDate} /> : null} />
        <EpInfoRow label="Completed" icon={Calendar} value={d?.completedDate ? <DateCell value={d.completedDate} /> : null} />
        <EpInfoRow label="Finished" icon={Calendar} value={d?.finishedDate ? <DateCell value={d.finishedDate} /> : null} />
      </EpSection>

    </EpMobileCard>
  );
}
