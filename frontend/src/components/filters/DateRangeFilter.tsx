/*
  The sign-up date filter. Reads as one control: a button that names the range
  it is holding, opening the calendar in a popover.

  Dates cross the wire as plain YYYY-MM-DD, built from the local calendar
  fields rather than toISOString(), which converts to UTC first and would send
  the previous day for anyone behind it.
*/

import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar, type DateRange } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  from?: string;
  to?: string;
  onChange: (next: { from?: string; to?: string }) => void;
  label?: string;
  className?: string;
}

function toIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function fromIsoDate(value?: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// "4 Oct" within this year, "4 Oct 2026" otherwise — the year only earns its
// space when it is not the obvious one.
function short(d: Date): string {
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function DateRangeFilter({
  from,
  to,
  onChange,
  label = 'Sign-up date',
  className,
}: DateRangeFilterProps) {
  const range: DateRange = { from: fromIsoDate(from), to: fromIsoDate(to) };
  const isActive = !!(range.from || range.to);

  function handleRangeChange(next: DateRange) {
    onChange({
      from: next.from ? toIsoDate(next.from) : undefined,
      to: next.to ? toIsoDate(next.to) : undefined,
    });
  }

  const text = !range.from
    ? label
    : range.to
      ? `${short(range.from)} – ${short(range.to)}`
      : `From ${short(range.from)}`;

  return (
    <div className={cn('flex items-center', className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-xs font-normal transition-colors',
                isActive &&
                  'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground',
              )}
              aria-label="Filter by sign-up date"
            />
          }
        >
          <CalendarDays size={14} />
          {text}
        </PopoverTrigger>

        <PopoverContent>
          <Calendar range={range} onRangeChange={handleRangeChange} maxDate={new Date()} />

          {isActive && (
            <div className="mt-2 flex justify-end border-t pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => onChange({ from: undefined, to: undefined })}
              >
                <X size={13} /> Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
