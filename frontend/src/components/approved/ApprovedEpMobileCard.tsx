import { useState } from 'react';
import { Plus, Minus, ExternalLink, MessageSquare } from 'lucide-react';
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

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function ExternalLinkRow({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
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
    <li className="rounded-2xl border border-border/70 bg-card overflow-hidden transition-colors list-none">
      {/* Header row */}
      <div 
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {getInitials(ep.fullName)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{ep.fullName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            EP ID {ep.id} · {ep.product}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadgeCell status={ep.statusOnExpa as EpStatus} />
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/50 bg-card px-4 py-4 space-y-4">
            
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-muted-foreground">
              {ep.memberName && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">Member</dt>
                  <dd className="text-foreground font-medium">{ep.memberName}</dd>
                </div>
              )}
              {ep.phone && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">Phone</dt>
                  <dd className="text-foreground">{ep.phone}</dd>
                </div>
              )}
              
              {d?.hostingMC && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Hosting MC</dt>
                  <dd className="text-foreground">{d.hostingMC}</dd>
                </div>
              )}
              {d?.hostingLC && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Hosting LC</dt>
                  <dd className="text-foreground">{d.hostingLC}</dd>
                </div>
              )}
              
              {d?.expaAppId && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">App ID</dt>
                  <dd className="text-foreground font-mono">{d.expaAppId}</dd>
                </div>
              )}
              {d?.opportunityTitle && (
                <div className={d?.expaAppId ? '' : 'col-span-2'}>
                  <dt className="font-medium text-foreground/70 mb-0.5">Opportunity</dt>
                  <dd className="text-foreground">{d.opportunityTitle}</dd>
                </div>
              )}
              
              {d?.approvalDate && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Approval</dt>
                  <dd className="text-foreground"><DateCell value={d.approvalDate} /></dd>
                </div>
              )}
              {d?.realizedDate && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Realized</dt>
                  <dd className="text-foreground"><DateCell value={d.realizedDate} /></dd>
                </div>
              )}
              {d?.finishedDate && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Finished</dt>
                  <dd className="text-foreground"><DateCell value={d.finishedDate} /></dd>
                </div>
              )}
              {d?.completedDate && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Completed</dt>
                  <dd className="text-foreground"><DateCell value={d.completedDate} /></dd>
                </div>
              )}
              
              {d?.projectFees != null && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Project Fees</dt>
                  <dd className="text-foreground">{d.projectFees.toLocaleString()}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-foreground/70 mb-0.5">Created</dt>
                <dd className="text-foreground"><DateCell value={ep.createdAtExpa} /></dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
              <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Links</span>
              <div className="flex items-center gap-3">
                <ExternalLinkRow href={d?.contractLink ?? null} label="Contract" />
                <ExternalLinkRow href={d?.auditFolder ?? null}  label="Audit Folder" />
              </div>
            </div>

            {canComment && (
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <button
                  type="button"
                  onClick={() => onCommentClick(ep)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare size={14} />
                  View Comments
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </li>
  );
}
