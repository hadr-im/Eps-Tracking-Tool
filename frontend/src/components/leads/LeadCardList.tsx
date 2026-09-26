// LeadCardList — mobile view of the dispatch lead pool.
//
// One row per lead. Everything the dispatcher needs to scan (name, product,
// status, when it came in) is visible without expanding; the extras open in
// place when the caret is tapped.

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DateCell } from '@/components/crm/cells/DateCell';
import { StatusBadgeCell } from '@/components/crm/cells/StatusBadgeCell';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/lead';
import type { EpStatus } from '@/types/ep';

interface LeadCardListProps {
  leads: Lead[];
  isLoading: boolean;
  canDispatch: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function LeadRow({
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

  const hasExtras = !!(lead.email || lead.phone || lead.university || lead.source);

  return (
    <li
      className={cn(
        // Flat row, not a full card. On mobile a stack of cards looks like a
        // series of buttons; single rows separated by a hairline read as a
        // list of records instead.
        'border-b border-border/70 bg-card transition-colors',
        isSelected && 'bg-aiesec-blue/5',
      )}
    >
      {/* Header — the always-visible summary */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        onClick={() => {
          if (canDispatch) onToggleSelection();
          else if (hasExtras) setExpanded((v) => !v);
        }}
      >
        {canDispatch && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelection}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${lead.fullName}`}
          />
        )}

        <UserAvatar fullName={lead.fullName} className="h-9 w-9" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {lead.fullName}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            <span className="tabular-nums">#{lead.id}</span>
            <span className="mx-1.5">·</span>
            <DateCell value={lead.createdAtExpa} />
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusBadgeCell status={lead.statusOnExpa as EpStatus} />
          {hasExtras && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={expanded ? 'Hide details' : 'Show details'}
              aria-expanded={expanded}
            >
              <ChevronDown
                size={16}
                className={cn('transition-transform', expanded && 'rotate-180')}
              />
            </button>
          )}
        </div>
      </div>

      {/* Extras — plain key/value rows rather than a boxed grid */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <dl className="px-4 pb-3 space-y-1.5 text-[12px]">
            {lead.email && <Row label="Email" value={lead.email} />}
            {lead.phone && <Row label="Phone" value={lead.phone} />}
            {lead.university && <Row label="University" value={lead.university} />}
            {lead.source && <Row label="Source" value={lead.source} />}
          </dl>
        </div>
      </div>
    </li>
  );
}

/*
  Key/value row. Label sits above the value so long strings (email, hashed
  addresses, full university names) get the full card width instead of being
  crushed to half. Truncated with an ellipsis when they still overflow.
*/
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground truncate">{value}</dd>
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
      <ul className="rounded-xl border bg-card overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-b-0">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-16 rounded-sm" />
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
    <ul className="rounded-xl border bg-card overflow-hidden [&>li:last-child]:border-b-0">
      {leads.map((lead) => (
        <LeadRow
          key={lead.id}
          lead={lead}
          canDispatch={canDispatch}
          isSelected={selectedSet.has(lead.id)}
          onToggleSelection={() => {
            onSelectionChange(
              selectedSet.has(lead.id)
                ? selectedIds.filter((id) => id !== lead.id)
                : [...selectedIds, lead.id],
            );
          }}
        />
      ))}
    </ul>
  );
}
