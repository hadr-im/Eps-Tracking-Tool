import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, MessageSquare } from 'lucide-react';
import { Badge }           from '@/components/ui/badge';
import { StatusBadgeCell } from '@/components/crm/cells/StatusBadgeCell';
import { DateCell }        from '@/components/crm/cells/DateCell';
import type { ApprovedEp } from '@/types/approvedEp';
import type { EpStatus }   from '@/types/ep';

interface ApprovedEpMobileCardProps {
  ep: ApprovedEp;
  canComment: boolean;
  onCommentClick: (ep: ApprovedEp) => void;
}

function ExternalLinkRow({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
    >
      {label}
      <ExternalLink size={10} />
    </a>
  );
}

export function ApprovedEpMobileCard({ ep, canComment, onCommentClick }: ApprovedEpMobileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const d = ep.approvedDetail;

  return (
    <li className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{ep.fullName}</span>
            <StatusBadgeCell status={ep.statusOnExpa as EpStatus} />
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
              {ep.product}
            </Badge>
          </div>

          {/* Key fields */}
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
            {ep.memberName && (
              <span>Member: <span className="text-foreground font-medium">{ep.memberName}</span></span>
            )}
            {d?.realizedDate && (
              <span>
                REA: <span className="text-foreground font-medium">
                  <DateCell value={d.realizedDate} />
                </span>
              </span>
            )}
            {d?.hostingMC && (
              <span>MC: <span className="text-foreground font-medium">{d.hostingMC}</span></span>
            )}
            {d?.hostingLC && (
              <span>LC: <span className="text-foreground font-medium">{d.hostingLC}</span></span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canComment && (
            <button
              type="button"
              onClick={() => onCommentClick(ep)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label={`Comments for ${ep.fullName}`}
            >
              <MessageSquare size={16} strokeWidth={1.6} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-2 text-xs bg-muted/20">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Row label="EP ID"        value={ep.id} mono />
            <Row label="Phone"        value={ep.phone} />
            <Row label="APP ID"       value={d?.expaAppId} mono />
            <Row label="Opportunity"  value={d?.opportunityTitle} />
            <Row label="Approval"     value={d ? <DateCell value={d.approvalDate} /> : null} />
            <Row label="REA Date"     value={d ? <DateCell value={d.realizedDate} /> : null} />
            <Row label="Finish"       value={d ? <DateCell value={d.finishedDate} /> : null} />
            <Row label="Completed"    value={d ? <DateCell value={d.completedDate} /> : null} />
            <Row
              label="Project Fees"
              value={d?.projectFees != null ? `${d.projectFees.toLocaleString()} €` : null}
            />
            <Row label="Created"      value={<DateCell value={ep.createdAtExpa} />} />
          </div>
          {/* Links */}
          <div className="flex flex-wrap gap-3 pt-1">
            <ExternalLinkRow href={d?.contractLink ?? null} label="Contract" />
            <ExternalLinkRow href={d?.auditFolder ?? null}  label="Audit Folder" />
          </div>
        </div>
      )}
    </li>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className={`text-foreground font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
