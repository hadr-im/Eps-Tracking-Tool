// Mobile card for a single EP 

import { useState } from 'react';
import { Pencil, MessageSquare, ChevronRight } from 'lucide-react';
import { StatusBadgeCell }   from './cells/StatusBadgeCell';
import { TrackingPhaseCell } from './cells/TrackingPhaseCell';
import { DateCell }          from './cells/DateCell';
import { EpDetailSheet }     from './EpDetailSheet';
import { Checkbox }          from '@/components/ui/checkbox';
import type { Ep, TrackingPhase } from '@/types/ep';

interface EpCardProps {
  ep: Ep;
  isPending: boolean;
  onCheckboxUpdate: (id: string, field: 'contacted' | 'interested', value: boolean) => void;
  onPhaseUpdate:    (id: string, phase: TrackingPhase | null) => void;
  onTextUpdate:     (id: string, field: string, value: string | null) => void;
}

export function EpCard({
  ep,
  isPending,
  onCheckboxUpdate,
  onPhaseUpdate,
  onTextUpdate,
}: EpCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const durationLabel = ep.duration
    ? ep.duration.charAt(0) + ep.duration.slice(1).toLowerCase()
    : null;

  return (
    <>
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* Section 1: Identity  */}
        <div className="px-4 pt-3.5 pb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Avatar initial + name on one line */}
            <div className="flex items-center gap-2">
              <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                {ep.fullName.charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold text-sm truncate">{ep.fullName}</p>
            </div>
            {/* EP ID + product */}
            <p className="text-[11px] text-muted-foreground mt-1 pl-9">
              EP ID {ep.id} · {ep.product}
            </p>
          </div>
          {/* Status pill */}
          <div className="shrink-0 pt-0.5">
            <StatusBadgeCell status={ep.statusOnExpa} />
          </div>
        </div>

        {/*  Section 2: Quick-edit  */}
        <div className="px-4 py-3 border-t space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* Phase select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12 shrink-0">Phase</span>
              <TrackingPhaseCell
                id={ep.id}
                value={ep.trackingPhase}
                isPending={isPending}
                onUpdate={onPhaseUpdate}
              />
            </div>

            {/* Contacted + Interested checkboxes */}
            <div className="flex items-center gap-4">
              <label
                htmlFor={`card-contacted-${ep.id}`}
                className="flex items-center gap-1.5 cursor-pointer select-none"
              >
                <Checkbox
                  id={`card-contacted-${ep.id}`}
                  checked={ep.contacted}
                  disabled={isPending}
                  onCheckedChange={(v) => onCheckboxUpdate(ep.id, 'contacted', Boolean(v))}
                  className={isPending ? 'opacity-50' : ''}
                />
                <span className="text-xs font-medium">Contacted</span>
              </label>

              <label
                htmlFor={`card-interested-${ep.id}`}
                className="flex items-center gap-1.5 cursor-pointer select-none"
              >
                <Checkbox
                  id={`card-interested-${ep.id}`}
                  checked={ep.interested}
                  disabled={isPending}
                  onCheckedChange={(v) => onCheckboxUpdate(ep.id, 'interested', Boolean(v))}
                  className={isPending ? 'opacity-50' : ''}
                />
                <span className="text-xs font-medium">Interested</span>
              </label>
            </div>
          </div>

          {/* Contacted at */}
          {ep.contactedAt && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span>Contacted at:</span>
              <DateCell value={ep.contactedAt} withTime />
            </p>
          )}
        </div>

        {/*  Section 3: Footer  */}
        <div className="px-4 py-3 border-t bg-muted/30 space-y-2">
          {/* Source · Duration */}
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/70">Source:</span>{' '}
            {ep.source ?? <span className="italic">—</span>}
            {durationLabel && (
              <>
                <span className="mx-1.5 text-border">·</span>
                <span className="font-medium text-foreground/70">Duration:</span>{' '}
                {durationLabel}
              </>
            )}
          </p>

          {/* Notes trigger + comments count + Open button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {/* Notes shortcut */}
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                title="Edit notes in full panel"
              >
                <Pencil size={11} />
                <span>Notes{ep.notes ? '' : ' (empty)'}</span>
              </button>

              {/* Comments placeholder */}
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MessageSquare size={11} />
                <span>0 comments</span>
              </span>
            </div>

            {/* Open full detail sheet */}
            <button
              type="button"
              id={`ep-open-${ep.id}`}
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Open
              <ChevronRight size={13} />
            </button>
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
