import { useState } from 'react';
import { Plus, Minus, MessageSquare } from 'lucide-react';
import { TransitionCell } from '@/components/crm/cells/TransitionCell';
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
    <li className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3">
        {/* Top row: Name & Phase */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="font-semibold text-sm truncate">{ep.fullName}</span>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 text-[10px] font-medium">
              Looking for Opportunities
            </span>
          </div>
        </div>

        {/* Bottom row: Subtitle & Actions */}
        <div className="flex items-end justify-between gap-2 mt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground flex-1">
            {memberName && (
              <span>Member: <span className="text-foreground font-medium">{memberName}</span></span>
            )}
            {availability && (
              <span>Availability: <span className="text-foreground font-medium">{availability}</span></span>
            )}
            {duration && (
              <span>Duration: <span className="text-foreground font-medium">{duration}</span></span>
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
            {(ep.notes || onTransition) && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground transition-colors p-1 rounded-md"
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
              >
                {expanded ? <Minus size={18} /> : <Plus size={18} />}
              </button>
            )}
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
            {ep.notes && (
              <div className="mb-3">
                <span className="text-xs font-medium text-foreground/70 block mb-1">Notes</span>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{ep.notes}</p>
              </div>
            )}
            
            {onTransition && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground">Transition</span>
                <TransitionCell
                  epId={ep.id}
                  currentProduct={ep.product}
                  isPending={isPending}
                  onTransition={onTransition}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
