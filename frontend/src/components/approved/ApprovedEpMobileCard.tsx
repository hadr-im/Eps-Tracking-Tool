import { useState } from 'react';
import { Plus, Minus, ExternalLink, MessageSquare } from 'lucide-react';
import { Badge }           from '@/components/ui/badge';
import { StatusBadgeCell } from '@/components/crm/cells/StatusBadgeCell';
import { DateCell }        from '@/components/crm/cells/DateCell';
import { cn }              from '@/lib/utils';
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
    <li className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3">
        
        {/* Top row: Name & Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="font-semibold text-sm truncate">{ep.fullName}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono shrink-0">
              {ep.product}
            </Badge>
          </div>
          <div className="shrink-0">
            <StatusBadgeCell status={ep.statusOnExpa as EpStatus} />
          </div>
        </div>

        {/* Bottom row: Subtitle & Actions */}
        <div className="flex items-end justify-between gap-2 mt-2">
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground flex-1">
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
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors p-1 rounded-md"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? <Minus size={18} /> : <Plus size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t px-4 py-3 space-y-2 text-xs bg-muted/10">
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
            <div className="flex flex-wrap gap-3 pt-2">
              <ExternalLinkRow href={d?.contractLink ?? null} label="Contract" />
              <ExternalLinkRow href={d?.auditFolder ?? null}  label="Audit Folder" />
            </div>
          </div>
        </div>
      </div>
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
