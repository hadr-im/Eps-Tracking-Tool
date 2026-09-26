// EpCard — mobile view for a member's own EP in My CRM.
// Uses the shared EpMobileCard shell so it matches every other page.

import { useState } from 'react';
import {
  MessageSquare,
  ChevronRight,
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Tag,
  ExternalLink,
  StickyNote,
  Compass,
  Timer,
} from 'lucide-react';

import { StatusBadgeCell }   from './cells/StatusBadgeCell';
import { TrackingPhaseCell } from './cells/TrackingPhaseCell';
import { DateCell }          from './cells/DateCell';
import { TransitionCell }    from './cells/TransitionCell';
import { DurationCell }      from './cells/DurationCell';
import { EditableTextCell }  from './cells/EditableTextCell';
import { EpDetailSheet }     from './EpDetailSheet';
import {
  EpMobileCard,
  EpSection,
  EpInfoRow,
  EpBlockRow,
} from './EpMobileCard';
import { cn } from '@/lib/utils';

import type { Ep, TrackingPhase } from '@/types/ep';

interface EpCardProps {
  ep: Ep;
  isPending: boolean;
  onCheckboxUpdate: (id: string, field: 'contacted' | 'interested', value: boolean) => void;
  onPhaseUpdate:    (id: string, phase: TrackingPhase | null) => void;
  onTextUpdate:     (id: string, field: string, value: string | null) => void;
  onTransition?:    (id: string, targetProduct: string) => void;
  onCommentClick?:  (ep: Ep) => void;
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

export function EpCard({
  ep,
  isPending,
  onCheckboxUpdate,
  onPhaseUpdate,
  onTextUpdate,
  onTransition,
  onCommentClick,
}: EpCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <EpMobileCard
        fullName={ep.fullName}
        id={ep.id}
        createdAt={ep.createdAtExpa}
        headerSub={<span>{ep.product}</span>}
        headerRight={<StatusBadgeCell status={ep.statusOnExpa} />}
        footer={
          <div className="flex items-center justify-between gap-3">
            {onCommentClick ? (
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
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Open Details
              <ChevronRight size={14} className="stroke-[2.5]" />
            </button>
          </div>
        }
      >
        <EpSection label="Contact" icon={User}>
          <EpInfoRow label="Email" icon={Mail} value={ep.email} />
          <EpInfoRow label="Phone" icon={Phone} value={ep.phone} />
        </EpSection>

        <EpSection label="Academic" icon={GraduationCap}>
          <EpInfoRow label="University" icon={GraduationCap} value={ep.university} />
          <EpInfoRow label="Field of Study" icon={BookOpen} value={ep.fieldOfStudy} />
          <EpInfoRow label="Year" value={ep.yearOfStudy} />
        </EpSection>

        <EpSection label="Pipeline" icon={Tag}>
          <div className="flex items-center gap-2 py-1.5 text-[12px]">
            <span className="text-muted-foreground shrink-0">Phase</span>
            <div className="flex-1 flex justify-end">
              <TrackingPhaseCell
                id={ep.id}
                value={ep.trackingPhase}
                isPending={isPending}
                onUpdate={onPhaseUpdate}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 py-1.5 text-[12px]">
            <span className="text-muted-foreground shrink-0">Duration</span>
            <div className="flex-1 flex justify-end">
              <DurationCell id={ep.id} value={ep.duration} isPending={isPending} onUpdate={onTextUpdate} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 py-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onCheckboxUpdate(ep.id, 'contacted', !ep.contacted)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                ep.contacted
                  ? 'border-aiesec-blue bg-aiesec-blue/10 text-aiesec-blue'
                  : 'border-border bg-transparent text-muted-foreground hover:bg-muted/50',
                isPending && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className={cn('h-1.5 w-1.5 rounded-full', ep.contacted ? 'bg-aiesec-blue' : 'bg-muted-foreground')} />
              Contacted
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => onCheckboxUpdate(ep.id, 'interested', !ep.interested)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                ep.interested
                  ? 'border-aiesec-blue bg-aiesec-blue/10 text-aiesec-blue'
                  : 'border-border bg-transparent text-muted-foreground hover:bg-muted/50',
                isPending && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className={cn('h-1.5 w-1.5 rounded-full', ep.interested ? 'bg-aiesec-blue' : 'bg-muted-foreground')} />
              Interested
            </button>

            {ep.contacted && ep.contactedAt && (
              <span className="text-[10px] text-muted-foreground ml-2">
                on <DateCell value={ep.contactedAt} />
              </span>
            )}
          </div>

          <EpInfoRow
            label="Source"
            value={
              <EditableTextCell
                id={ep.id}
                field="source"
                value={ep.source}
                isPending={isPending}
                onUpdate={onTextUpdate}
              />
            }
          />
          <EpInfoRow label="CV Link" icon={ExternalLink} value={<CvLink href={ep.cvLink} />} />
          <EpBlockRow
            label="Notes"
            icon={StickyNote}
            value={
              <EditableTextCell
                id={ep.id}
                field="notes"
                value={ep.notes}
                isPending={isPending}
                multiline
                placeholder="Add a note..."
                onUpdate={onTextUpdate}
              />
            }
          />
        </EpSection>

        <EpSection label="Interests" icon={Compass}>
          <EpInfoRow label="Duration" icon={Timer} value={ep.duration ? ep.duration.charAt(0) + ep.duration.slice(1).toLowerCase() : null} />
          <EpInfoRow label="Availability" value={ep.availability?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
        </EpSection>

        {onTransition && (
          <EpSection label="Transition" icon={ChevronRight}>
            <div className="py-2">
              <TransitionCell
                epId={ep.id}
                currentProduct={ep.product}
                isPending={isPending}
                onTransition={onTransition}
              />
            </div>
          </EpSection>
        )}
      </EpMobileCard>

      <EpDetailSheet
        ep={ep}
        open={sheetOpen}
        isPending={isPending}
        onOpenChange={setSheetOpen}
        onCheckboxUpdate={onCheckboxUpdate}
        onPhaseUpdate={onPhaseUpdate}
        onTextUpdate={onTextUpdate}
      />
    </>
  );
}
