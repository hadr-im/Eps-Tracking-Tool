/*
  The period a dashboard covers.

  Presets rather than a calendar: these are the ranges people actually ask for
  out loud ("how did we do this month?"), and picking two dates to express
  "last month" is work the reader should not have to do. The Dispatch page
  keeps its calendar, because there the question is about particular days.

  Resolved here rather than on the server: "this week" depends on the reader's
  clock, and the API should not be guessing at a timezone. It receives two
  plain dates.
*/

import { CalendarRange, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months';

export interface DateWindow {
  from?: string;
  to?: string;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
];

// Local calendar fields, never toISOString: that converts to UTC first and
// would send the previous day for anyone behind it.
function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/*
  Both bounds are inclusive days; the API widens `to` to the end of its day.
  The week starts on Monday, which is how the LC talks about its week.
*/
export function windowForPreset(preset: DatePreset): DateWindow {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { from: iso(today), to: iso(today) };

    case 'yesterday': {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return { from: iso(d), to: iso(d) };
    }

    case 'this_week': {
      const monday = new Date(today);
      // getDay() is Sunday-first; shift so Monday is the start.
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return { from: iso(monday), to: iso(today) };
    }

    case 'this_month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(today) };

    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      // Day 0 of this month is the last day of the previous one.
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(first), to: iso(last) };
    }

    case 'last_3_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from: iso(start), to: iso(today) };
    }

    case 'all':
    default:
      return {};
  }
}

interface DateRangePresetFilterProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
  className?: string;
  /*
    The figures on screen are the previous period's while the new ones load.
    They are kept deliberately — a dashboard that empties itself on every
    change of dropdown reads as a reload — so something has to say they are
    being refreshed, or a stale number looks like the answer.
  */
  isRefreshing?: boolean;
}

export function DateRangePresetFilter({
  value,
  onChange,
  className,
  isRefreshing = false,
}: DateRangePresetFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Loader2
        size={14}
        aria-hidden
        className={`shrink-0 animate-spin text-muted-foreground transition-opacity duration-150 ${
          isRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span className="sr-only" role="status">
        {isRefreshing ? 'Updating the figures for the period you picked' : ''}
      </span>
      <Select value={value} onValueChange={(v) => v && onChange(v as DatePreset)}>
        <SelectTrigger
          className={className ?? 'h-8 w-40 text-xs'}
          aria-label="Period covered by the dashboard"
        >
          <CalendarRange size={14} className="shrink-0 opacity-70" />
          <SelectValue>
            {(v) => PRESETS.find((p) => p.value === v)?.label ?? 'All time'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="text-xs">
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value} label={p.label}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
