import { Skeleton } from '@/components/ui/skeleton';
import { Badge }    from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DateCell } from '@/components/crm/cells/DateCell';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/lead';

const STATUS_COLORS: Record<string, string> = {
  LEAD:       'bg-sidebar-primary text-white border-sidebar-primary',
  CONTACTED:  'bg-blue-500   text-white border-blue-500',
  INTERESTED: 'bg-violet-500 text-white border-violet-500',
};

interface LeadCardListProps {
  leads: Lead[];
  isLoading: boolean;
  canDispatch: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function LeadMobileCard({
  lead,
  canDispatch,
  isSelected,
  onToggleSelection,
}: {
  lead: Lead;
  canDispatch: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-all duration-200 relative",
        isSelected ? "ring-2 ring-primary border-transparent" : "border-border/70"
      )}
    >
      {/* Header row */}
      <div 
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => {
          if (canDispatch) onToggleSelection();
          else setExpanded(!expanded);
        }}
      >
        {canDispatch && (
          <div className="flex h-9 items-center pt-0.5">
             <Checkbox
               checked={isSelected}
               onCheckedChange={onToggleSelection}
               aria-label={`Select ${lead.fullName}`}
               onClick={(e) => e.stopPropagation()}
             />
          </div>
        )}

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {getInitials(lead.fullName)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{lead.fullName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            EP ID {lead.id} · {lead.product}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_COLORS[lead.statusOnExpa] ?? 'bg-muted text-muted-foreground'}`}
          >
            {lead.statusOnExpa.charAt(0) + lead.statusOnExpa.slice(1).toLowerCase()}
          </Badge>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
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
          <div className="border-t border-border/50 bg-card px-4 py-4">
             <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-muted-foreground">
              {lead.email && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">Email</dt>
                  <dd className="truncate text-foreground">{lead.email}</dd>
                </div>
              )}
              {lead.phone && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Phone</dt>
                  <dd className="text-foreground">{lead.phone}</dd>
                </div>
              )}
              {lead.university && (
                <div className={lead.phone ? '' : 'col-span-2'}>
                  <dt className="font-medium text-foreground/70 mb-0.5">University</dt>
                  <dd className="truncate text-foreground">{lead.university}</dd>
                </div>
              )}
              {lead.source && (
                <div>
                  <dt className="font-medium text-foreground/70 mb-0.5">Source</dt>
                  <dd className="text-foreground">{lead.source}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-foreground/70 mb-0.5">Created</dt>
                <dd className="text-foreground"><DateCell value={lead.createdAtExpa} /></dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadCardList({
  leads,
  isLoading,
  canDispatch,
  selectedIds,
  onSelectionChange,
}: LeadCardListProps) {
  const selectedSet = new Set(selectedIds);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
               <Skeleton className="h-9 w-9 rounded-full shrink-0" />
               <div className="space-y-1.5 flex-1">
                 <Skeleton className="h-4 w-32" />
                 <Skeleton className="h-3 w-20" />
               </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No leads found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <LeadMobileCard 
          key={lead.id}
          lead={lead}
          canDispatch={canDispatch}
          isSelected={selectedSet.has(lead.id)}
          onToggleSelection={() => {
            onSelectionChange(
              selectedSet.has(lead.id)
                ? selectedIds.filter((id) => id !== lead.id)
                : [...selectedIds, lead.id]
            );
          }}
        />
      ))}
    </div>
  );
}
