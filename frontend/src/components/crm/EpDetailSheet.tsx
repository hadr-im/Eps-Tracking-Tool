import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { StatusBadgeCell }   from './cells/StatusBadgeCell';
import { TrackingPhaseCell } from './cells/TrackingPhaseCell';
import { EditableTextCell }  from './cells/EditableTextCell';
import { CheckboxCell }      from './cells/CheckboxCell';
import { DateCell }          from './cells/DateCell';
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

// Small labeled row 

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 items-start py-2 border-b last:border-b-0">
      <span className="text-xs font-medium text-muted-foreground pt-0.5 shrink-0">{label}</span>
      <div className="text-xs min-w-0">{children}</div>
    </div>
  );
}

// Section divider 

function Section({ label, color }: { label: string; color: string }) {
  return (
    <div className={`-mx-6 px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest ${color} mt-4 first:mt-0`}>
      {label}
    </div>
  );
}

// Component 

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
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <SheetHeader className="pb-3 border-b">
          <div className="flex items-start gap-2 pr-8">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold truncate">{ep.fullName}</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                EP ID {ep.id} · {ep.product}
              </SheetDescription>
            </div>
            <StatusBadgeCell status={ep.statusOnExpa} />
          </div>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          {/* General Info */}
          <Section label="General Info" color="bg-blue-500 text-white" />
          <Row label="Email">
            {ep.email
              ? <a href={`mailto:${ep.email}`} className="text-blue-600 hover:underline break-all">{ep.email}</a>
              : <span className="text-muted-foreground">—</span>}
          </Row>
          <Row label="Phone">
            <span>{ep.phone ?? <span className="text-muted-foreground">—</span>}</span>
          </Row>
          <Row label="University">
            <span>{ep.university ?? <span className="text-muted-foreground">—</span>}</span>
          </Row>
          <Row label="Field of Study">
            <span>{ep.fieldOfStudy ?? <span className="text-muted-foreground">—</span>}</span>
          </Row>
          <Row label="Year">
            <span>{ep.yearOfStudy ?? <span className="text-muted-foreground">—</span>}</span>
          </Row>
          <Row label="Created on EXPA">
            <DateCell value={ep.createdAtExpa} />
          </Row>

          {/* CRM */}
          <Section label="CRM" color="bg-amber-500 text-white" />
          <Row label="Phase">
            <TrackingPhaseCell id={ep.id} value={ep.trackingPhase} isPending={isPending} onUpdate={onPhaseUpdate} />
          </Row>
          <Row label="Contacted">
            <div className="flex items-center gap-2">
              <CheckboxCell id={ep.id} field="contacted" value={ep.contacted} isPending={isPending} onUpdate={onCheckboxUpdate} />
              {ep.contactedAt && (
                <span className="text-muted-foreground"><DateCell value={ep.contactedAt} withTime /></span>
              )}
            </div>
          </Row>
          <Row label="Interested">
            <CheckboxCell id={ep.id} field="interested" value={ep.interested} isPending={isPending} onUpdate={onCheckboxUpdate} />
          </Row>
          <Row label="Assigned At">
            <DateCell value={ep.assignedAt} />
          </Row>
          <Row label="Source">
            <EditableTextCell id={ep.id} field="source" value={ep.source} isPending={isPending} onUpdate={onTextUpdate} />
          </Row>
          <Row label="CV Link">
            {ep.cvLink
              ? <a href={ep.cvLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{ep.cvLink}</a>
              : <EditableTextCell id={ep.id} field="cvLink" value={null} isPending={isPending} onUpdate={onTextUpdate} />}
          </Row>
          <Row label="Notes">
            <EditableTextCell id={ep.id} field="notes" value={ep.notes} isPending={isPending} multiline placeholder="Add note…" onUpdate={onTextUpdate} />
          </Row>

          {/* Interests */}
          <Section label="Interests" color="bg-emerald-500 text-white" />
          <Row label="Duration">
            <span className="capitalize">{ep.duration?.toLowerCase() ?? <span className="text-muted-foreground">—</span>}</span>
          </Row>
          <Row label="Availability">
            <span>{availability ?? <span className="text-muted-foreground">—</span>}</span>
          </Row>
        </div>
      </SheetContent>
    </Sheet>
  );
}
