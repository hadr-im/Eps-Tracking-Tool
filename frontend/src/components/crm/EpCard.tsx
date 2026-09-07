// Mobile card for a single EP 

import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Pencil, MessageSquare, ChevronRight, Plus, Minus } from 'lucide-react';
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
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Section 1: Identity (Always visible) */}
        <div className="px-4 py-3">
          {/* Top row: Name & Status */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm truncate flex-1">{ep.fullName}</p>
            <div className="shrink-0">
              <StatusBadgeCell status={ep.statusOnExpa} />
            </div>
          </div>
          
          {/* Bottom row: Subtitle & Plus button */}
          <div className="flex items-end justify-between gap-2 mt-1">
            <p className="text-[11px] text-muted-foreground flex-1">
              EP ID {ep.id} · {ep.product}
            </p>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 p-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? <Minus size={18} /> : <Plus size={18} />}
            </button>
          </div>
        </div>

        {/* Section 2: Expanded Details */}
        <div
          className={cn(
            'grid transition-all duration-300 ease-in-out',
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-3 pt-1 border-t space-y-3 bg-muted/10">
              
              {/* Tracking Phase */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-medium text-foreground/70 w-16 shrink-0">Phase</span>
                <TrackingPhaseCell
                  id={ep.id}
                  value={ep.trackingPhase}
                  isPending={isPending}
                  onUpdate={onPhaseUpdate}
                />
              </div>

              {/* Checkboxes */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <Checkbox
                    checked={ep.contacted}
                    disabled={isPending}
                    onCheckedChange={(v) => onCheckboxUpdate(ep.id, 'contacted', Boolean(v))}
                    className={isPending ? 'opacity-50' : ''}
                  />
                  <span className="text-xs font-medium">Contacted</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <Checkbox
                    checked={ep.interested}
                    disabled={isPending}
                    onCheckedChange={(v) => onCheckboxUpdate(ep.id, 'interested', Boolean(v))}
                    className={isPending ? 'opacity-50' : ''}
                  />
                  <span className="text-xs font-medium">Interested</span>
                </label>

                {ep.contacted && ep.contactedAt && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    (on <DateCell value={ep.contactedAt} />)
                  </span>
                )}
              </div>

              {/* Editable Fields (Source, Duration) */}
              <div className="grid grid-cols-[4rem_1fr] gap-x-2 gap-y-2 items-center">
                <span className="text-xs font-medium text-foreground/70">Source</span>
                <div className="flex">
                  <EditableTextCell id={ep.id} field="source" value={ep.source} isPending={isPending} onUpdate={onTextUpdate} />
                </div>
                
                <span className="text-xs font-medium text-foreground/70">Duration</span>
                <DurationCell id={ep.id} value={ep.duration} isPending={isPending} onUpdate={onTextUpdate} />
              </div>

              {/* Notes */}
              <div className="pt-1">
                <span className="text-xs font-medium text-foreground/70 block mb-1">Notes</span>
                <EditableTextCell id={ep.id} field="notes" value={ep.notes} isPending={isPending} multiline placeholder="Add a note..." onUpdate={onTextUpdate} />
              </div>

              {/* Footer Actions (Comments & Open) */}
              <div className="pt-3 mt-1 border-t border-border/50 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare size={13} />
                  <span>0 comments</span>
                </span>

                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded"
                >
                  Open Details
                  <ChevronRight size={13} />
                </button>
              </div>
              
              {/* Transition (if applicable) */}
              {onTransition && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground w-16 shrink-0">Transition</span>
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
      </div>

      {/* Full detail sheet */}
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
