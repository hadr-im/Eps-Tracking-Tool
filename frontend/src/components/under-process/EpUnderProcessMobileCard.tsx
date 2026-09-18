import { useState } from 'react';
import { Plus, Minus, MessageSquare, ExternalLink } from 'lucide-react';
import { TransitionCell } from '@/components/crm/cells/TransitionCell';
import { DateCell } from '@/components/crm/cells/DateCell';
import { cn } from '@/lib/utils';
import type { Ep } from '@/types/ep';

interface EpUnderProcessMobileCardProps {
  ep: Ep;
  memberName: string | null;
  canComment: boolean;
  onCommentClick: (ep: Ep) => void;
  onTransition?: (epId: string, targetProduct: string) => void;
  isPending?: boolean;
}

function label(v: string | null, transform: (s: string) => string) {
  return v ? transform(v) : null;
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function BoolText({ value }: { value: boolean | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return value ? (
    <span className="text-emerald-600 font-medium">Yes</span>
  ) : (
    <span className="text-muted-foreground">No</span>
  );
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

export function EpUnderProcessMobileCard({
  ep,
  memberName,
  canComment,
  onCommentClick,
  onTransition,
  isPending = false,
}: EpUnderProcessMobileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const availability = label(ep.availability, (v) =>
    v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  );
  const duration = label(ep.duration, (v) =>
    v.charAt(0) + v.slice(1).toLowerCase(),
  );

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
          {ep.trackingPhase ? (
            <span className="inline-flex items-center rounded-full bg-amber-600 text-white px-2 py-0.5 text-[10px] font-medium shrink-0">
              {ep.trackingPhase
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          ) : (
            <span className="text-muted-foreground text-[10px]">No phase</span>
          )}
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
              {memberName && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">Member</dt>
                  <dd className="text-foreground font-medium">{memberName}</dd>
                </div>
              )}
              {ep.email && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">Email</dt>
                  <dd className="text-foreground truncate">{ep.email}</dd>
                </div>
              )}
              {ep.phone && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">Phone</dt>
                  <dd className="text-foreground">{ep.phone}</dd>
                </div>
              )}
              {ep.university && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">University</dt>
                  <dd className="text-foreground truncate">{ep.university}</dd>
                </div>
              )}
              {ep.fieldOfStudy && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">Field of Study</dt>
                  <dd className="text-foreground truncate">{ep.fieldOfStudy}</dd>
                </div>
              )}
              {ep.yearOfStudy && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Year of Study</dt>
                  <dd className="text-foreground">{ep.yearOfStudy}</dd>
                </div>
              )}
              {ep.source && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Source</dt>
                  <dd className="text-foreground">{ep.source}</dd>
                </div>
              )}
              {availability && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Availability</dt>
                  <dd className="text-foreground">{availability}</dd>
                </div>
              )}
              {duration && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Duration</dt>
                  <dd className="text-foreground">{duration}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-foreground/70 mb-0.5">Contacted</dt>
                <dd><BoolText value={ep.contacted} /></dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70 mb-0.5">Interested</dt>
                <dd><BoolText value={ep.interested} /></dd>
              </div>
              {ep.contactedAt && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Contacted At</dt>
                  <dd className="text-foreground"><DateCell value={ep.contactedAt} /></dd>
                </div>
              )}
              {ep.assignedAt && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Assigned At</dt>
                  <dd className="text-foreground"><DateCell value={ep.assignedAt} /></dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-foreground/70 mb-0.5">Created</dt>
                <dd className="text-foreground"><DateCell value={ep.createdAtExpa} /></dd>
              </div>
            </dl>

            {ep.cvLink && (
              <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Links</span>
                <div className="flex items-center gap-3">
                  <ExternalLinkRow href={ep.cvLink} label="CV" />
                </div>
              </div>
            )}

            {ep.notes && (
              <div className="border-t border-border/50 pt-3">
                <span className="text-xs font-medium text-foreground/70 block mb-1">Notes</span>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{ep.notes}</p>
              </div>
            )}
            
            {onTransition && (
              <div className="flex items-center gap-3 border-t border-border/50 pt-3">
                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Transition</span>
                <TransitionCell
                  epId={ep.id}
                  currentProduct={ep.product}
                  isPending={isPending}
                  onTransition={onTransition}
                />
              </div>
            )}

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
