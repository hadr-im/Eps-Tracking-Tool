// Mobile card for a single EP

import { cn } from '@/lib/utils';
import { useState } from 'react';
import { MessageSquare, ChevronRight, Plus, Minus } from 'lucide-react';
import { StatusBadgeCell }   from './cells/StatusBadgeCell';
import { TrackingPhaseCell } from './cells/TrackingPhaseCell';
import { DateCell }          from './cells/DateCell';
import { TransitionCell }    from './cells/TransitionCell';
import { DurationCell }      from './cells/DurationCell';
import { EditableTextCell }  from './cells/EditableTextCell';
import { EpDetailSheet }     from './EpDetailSheet';
import { Checkbox }          from '@/components/ui/checkbox';
import type { Ep, TrackingPhase } from '@/types/ep';

interface EpCardProps {
  ep: Ep;
  isPending: boolean;
  onCheckboxUpdate: (id: string, field: 'contacted' | 'interested', value: boolean) => void;
  onPhaseUpdate:    (id: string, phase: TrackingPhase | null) => void;
  onTextUpdate:     (id: string, field: string, value: string | null) => void;
  onTransition?:    (id: string, targetProduct: string) => void;
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function EpCard({
  ep,
  isPending,
  onCheckboxUpdate,
  onPhaseUpdate,
  onTextUpdate,
  onTransition,
}: EpCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden transition-colors">
        {/* Header row: avatar, name, status, expand toggle */}
        <div className="flex items-start gap-3 px-4 py-3.5">
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
            <StatusBadgeCell status={ep.statusOnExpa} />
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
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
            <div className="border-t border-border/70 bg-muted/20 px-4 py-4 space-y-4">
             {/* Phase & Duration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">Phase</span>
                  <TrackingPhaseCell
                    id={ep.id}
                    value={ep.trackingPhase}
                    isPending={isPending}
                    onUpdate={onPhaseUpdate}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">Duration</span>
                  <DurationCell id={ep.id} value={ep.duration} isPending={isPending} onUpdate={onTextUpdate} />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <label className="flex cursor-pointer select-none items-center gap-1.5">
                  <Checkbox
                    checked={ep.contacted}
                    disabled={isPending}
                    onCheckedChange={(v) => onCheckboxUpdate(ep.id, 'contacted', Boolean(v))}
                    className={isPending ? 'opacity-50' : ''}
                  />
                  <span className="text-xs font-medium">Contacted</span>
                </label>

                <label className="flex cursor-pointer select-none items-center gap-1.5">
                  <Checkbox
                    checked={ep.interested}
                    disabled={isPending}
                    onCheckedChange={(v) => onCheckboxUpdate(ep.id, 'interested', Boolean(v))}
                    className={isPending ? 'opacity-50' : ''}
                  />
                  <span className="text-xs font-medium">Interested</span>
                </label>

                {ep.contacted && ep.contactedAt && (
                  <span className="text-[10px] text-muted-foreground">
                    on <DateCell value={ep.contactedAt} />
                  </span>
                )}
              </div>

              {/* Source */}
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">Source</span>
                <EditableTextCell id={ep.id} field="source" value={ep.source} isPending={isPending} onUpdate={onTextUpdate} />
              </div>

              {/* Notes */}
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">Notes</span>
                <EditableTextCell id={ep.id} field="notes" value={ep.notes} isPending={isPending} multiline placeholder="Add a note..." onUpdate={onTextUpdate} />
              </div>

              {/* Transition */}
              {onTransition && (
                <div className="flex items-center gap-3 border-t border-border/60 pt-3">
                  <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Transition</span>
                  <TransitionCell
                    epId={ep.id}
                    currentProduct={ep.product}
                    isPending={isPending}
                    onTransition={onTransition}
                  />
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare size={13} />
                  0 comments
                </span>

                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Open Details
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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