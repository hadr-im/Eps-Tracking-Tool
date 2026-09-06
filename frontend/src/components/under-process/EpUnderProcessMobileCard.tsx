import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import type { Ep } from '@/types/ep';

interface EpUnderProcessMobileCardProps {
  ep: Ep;
  memberName: string | null;
  canComment: boolean;
  onCommentClick: (ep: Ep) => void;
}

function label(v: string | null, transform: (s: string) => string) {
  return v ? transform(v) : null;
}

export function EpUnderProcessMobileCard({
  ep,
  memberName,
  canComment,
  onCommentClick,
}: EpUnderProcessMobileCardProps) {
  const [expanded, setExpanded] = useState(false);

  const availability = label(ep.availability, (v) =>
    v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  );
  const duration = label(ep.duration, (v) =>
    v.charAt(0) + v.slice(1).toLowerCase(),
  );

  return (
    <li className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          {/* Name + phase badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{ep.fullName}</span>
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 text-[10px] font-medium">
              Looking for Opportunities
            </span>
          </div>

          {/* Key fields */}
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
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

          {/* Notes preview */}
          {ep.notes && (
            <p className={`mt-1.5 text-[11px] text-muted-foreground ${!expanded ? 'line-clamp-2' : ''}`}>
              {ep.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {canComment && (
            <button
              type="button"
              onClick={() => onCommentClick(ep)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent"
              aria-label={`Comments for ${ep.fullName}`}
            >
              <MessageSquare size={16} strokeWidth={1.6} />
            </button>
          )}
          {ep.notes && ep.notes.length > 80 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-accent"
              aria-label={expanded ? 'Collapse notes' : 'Expand notes'}
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
