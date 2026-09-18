import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ChevronDown, User, FileSpreadsheet , Star } from 'lucide-react';
import { StatusBadgeCell }   from './cells/StatusBadgeCell';
import { TrackingPhaseCell } from './cells/TrackingPhaseCell';
import { EditableTextCell }  from './cells/EditableTextCell';
import { CheckboxCell }      from './cells/CheckboxCell';
import { DateCell }          from './cells/DateCell';
import { DurationCell }      from './cells/DurationCell';
import { AvailabilityCell }  from './cells/AvailabilityCell';
import type { Ep, TrackingPhase } from '@/types/ep';

interface EpDetailSheetProps {
  ep: Ep;
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckboxUpdate: (id: string, field: 'contacted' | 'interested', value: boolean) => void;
  onPhaseUpdate:    (id: string, phase: TrackingPhase | null) => void;
  onTextUpdate:     (id: string, field: string, value: string | null) => void;
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="border border-border/70 rounded-2xl bg-card overflow-hidden mt-4 first:mt-0 min-w-0">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2.5 text-sm font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
            <Icon size={16} />
          </span>
          {title}
        </div>
        <ChevronDown size={16} className="text-muted-foreground" />
      </div>
      <div className="px-4 pb-5 space-y-3 min-w-0">
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2 items-center min-w-0">
      <span className="text-xs font-semibold text-muted-foreground shrink-0">{label}</span>
      <div className="text-xs min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

function ReadOnlyField({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 rounded-xl border border-border bg-transparent text-xs min-h-9 flex items-center min-w-0 overflow-hidden">
      <div className="truncate min-w-0 w-full">{children}</div>
    </div>
  );
}

export function EpDetailSheet({
  ep,
  open,
  isPending,
  onOpenChange,
  onCheckboxUpdate,
  onPhaseUpdate,
  onTextUpdate,
}: EpDetailSheetProps) {
  const availability = ep.availability
    ? ep.availability.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col overflow-hidden bg-card p-0 border-l">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b bg-card">
          <div className="flex items-start gap-2 pr-8">
            <div className="flex-1 min-w-0 text-left">
              <SheetTitle className="text-lg font-bold truncate">{ep.fullName}</SheetTitle>
              <SheetDescription className="text-xs mt-1">
                EP ID {ep.id} · {ep.product}
                {availability && ` · ${availability}`}
              </SheetDescription>
            </div>
            <StatusBadgeCell status={ep.statusOnExpa} />
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-w-0">

          {/* General Info */}
          <SectionCard title="General Information" icon={User}>
            <Row label="Email">
              <ReadOnlyField>
                {ep.email ? <a href={`mailto:${ep.email}`} className="text-blue-600 hover:underline break-all">{ep.email}</a> : <span className="text-muted-foreground">—</span>}
              </ReadOnlyField>
            </Row>
            <Row label="Phone">
              <ReadOnlyField>{ep.phone ?? <span className="text-muted-foreground">—</span>}</ReadOnlyField>
            </Row>
            <Row label="University">
              <ReadOnlyField>{ep.university ?? <span className="text-muted-foreground">—</span>}</ReadOnlyField>
            </Row>
            <Row label="Field of Study">
              <ReadOnlyField>{ep.fieldOfStudy ?? <span className="text-muted-foreground">—</span>}</ReadOnlyField>
            </Row>
            <Row label="Year">
              <ReadOnlyField>{ep.yearOfStudy ?? <span className="text-muted-foreground">—</span>}</ReadOnlyField>
            </Row>
            <Row label="Created on">
              <ReadOnlyField><DateCell value={ep.createdAtExpa} /></ReadOnlyField>
            </Row>
          </SectionCard>

          {/* CRM */}
          <SectionCard title="CRM" icon={FileSpreadsheet}>
            <Row label="Phase">
              <TrackingPhaseCell id={ep.id} value={ep.trackingPhase} isPending={isPending} onUpdate={onPhaseUpdate} />
            </Row>
            <Row label="Contacted">
              <ReadOnlyField>
                <div className="flex items-center gap-2">
                  <CheckboxCell id={ep.id} field="contacted" value={ep.contacted} isPending={isPending} onUpdate={onCheckboxUpdate} />
                  {ep.contactedAt && (
                    <span className="text-muted-foreground ml-auto"><DateCell value={ep.contactedAt} /></span>
                  )}
                </div>
              </ReadOnlyField>
            </Row>
            <Row label="Interested">
              <ReadOnlyField>
                <CheckboxCell id={ep.id} field="interested" value={ep.interested} isPending={isPending} onUpdate={onCheckboxUpdate} />
              </ReadOnlyField>
            </Row>
            <Row label="Assigned At">
              <ReadOnlyField><DateCell value={ep.assignedAt} /></ReadOnlyField>
            </Row>
            <Row label="Source">
              <EditableTextCell id={ep.id} field="source" value={ep.source} isPending={isPending} onUpdate={onTextUpdate} />
            </Row>
            <Row label="CV Link">
              <div className="flex items-center gap-2 w-full">
                <EditableTextCell id={ep.id} field="cvLink" value={ep.cvLink} isPending={isPending} placeholder="Add CV link…" onUpdate={onTextUpdate} />
                {ep.cvLink && (
                  <a href={ep.cvLink} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-500 hover:text-blue-700" title="Open CV">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </a>
                )}
              </div>
            </Row>
            <Row label="Notes">
              <EditableTextCell id={ep.id} field="notes" value={ep.notes} isPending={isPending} multiline placeholder="Add note…" onUpdate={onTextUpdate} />
            </Row>
          </SectionCard>

          {/* Interests */}
          <SectionCard title="Interests" icon={Star}>
            <Row label="Duration">
              <DurationCell id={ep.id} value={ep.duration} isPending={isPending} onUpdate={onTextUpdate} />
            </Row>
            <Row label="Availability">
              <AvailabilityCell id={ep.id} value={ep.availability} isPending={isPending} onUpdate={onTextUpdate} />
            </Row>
          </SectionCard>

        </div>
      </SheetContent>
    </Sheet>
  );
}
