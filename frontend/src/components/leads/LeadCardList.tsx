// Each card shows core EP info, when canDispatch = true, includes a checkbox for bulk selection

import { Skeleton } from '@/components/ui/skeleton';
import { Badge }    from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { Lead } from '@/types/lead';

const STATUS_COLORS: Record<string, string> = {
  LEAD:       'bg-slate-600  text-white border-slate-600',
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
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </li>
        ))}
      </ul>
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
    <ul className="space-y-3">
      {leads.map((lead) => (
        <li
          key={lead.id}
          className={`rounded-xl border bg-card p-4 space-y-3 text-sm transition-colors ${
            selectedSet.has(lead.id) ? 'ring-2 ring-primary border-transparent' : ''
          }`}
          onClick={() => {
            if (!canDispatch) return;
            onSelectionChange(
              selectedSet.has(lead.id)
                ? selectedIds.filter((id) => id !== lead.id)
                : [...selectedIds, lead.id]
            );
          }}
        >
          {/* Name + status + checkbox */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              {canDispatch && (
                <Checkbox
                  checked={selectedSet.has(lead.id)}
                  onCheckedChange={(checked) => {
                    onSelectionChange(
                      checked
                        ? [...selectedIds, lead.id]
                        : selectedIds.filter((id) => id !== lead.id)
                    );
                  }}
                  aria-label={`Select ${lead.fullName}`}
                  // Stop propagation so the li onClick doesn't double-fire
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <span className="font-semibold text-base leading-tight">{lead.fullName}</span>
            </div>
            <Badge
              variant="outline"
              className={`text-xs shrink-0 ${STATUS_COLORS[lead.statusOnExpa] ?? 'bg-muted text-muted-foreground'}`}
            >
              {lead.statusOnExpa.charAt(0) + lead.statusOnExpa.slice(1).toLowerCase()}
            </Badge>
          </div>

          {/* Details grid */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground ml-7">
            <div>
              <dt className="font-medium text-foreground/70">EP ID</dt>
              <dd className="font-mono truncate">{lead.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Programme</dt>
              <dd className="font-mono">{lead.product}</dd>
            </div>
            {lead.email && (
              <div className="col-span-2">
                <dt className="font-medium text-foreground/70">Email</dt>
                <dd className="truncate">{lead.email}</dd>
              </div>
            )}
            {lead.phone && (
              <div>
                <dt className="font-medium text-foreground/70">Phone</dt>
                <dd>{lead.phone}</dd>
              </div>
            )}
            {lead.university && (
              <div className={lead.phone ? '' : 'col-span-2'}>
                <dt className="font-medium text-foreground/70">University</dt>
                <dd className="truncate">{lead.university}</dd>
              </div>
            )}
            {lead.source && (
              <div>
                <dt className="font-medium text-foreground/70">Source</dt>
                <dd>{lead.source}</dd>
              </div>
            )}
            <div>
              <dt className="font-medium text-foreground/70">Created</dt>
              <dd>{new Date(lead.createdAtExpa).toLocaleDateString()}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
