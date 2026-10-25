/*
  A small month-grid calendar, written for this app rather than pulled in.

  react-day-picker plus date-fns would have been the quick route, but it is
  roughly 40KB on a bundle that was just cut from 1.38MB to 507KB, and almost
  all of it covers cases this app does not have. What is needed here is one
  month at a time, a range of two dates, and styling that matches the rest of
  the UI — which is the code below, with no dependencies.

  Dates are handled in local time throughout. Using UTC would shift the day
  boundary for anyone east or west of it, so a lead that signed up late on the
  30th would land under the 31st in the picker.
*/

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface CalendarProps {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  // Nothing after today can be a sign-up date.
  maxDate?: Date;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/*
  The six-week grid for a month, including the trailing days of the previous
  month and the leading days of the next, so every month renders at the same
  height and the popover does not resize as you page through it.
*/
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);

  // getDay() is Sunday-first; this calendar starts on Monday.
  const offset = (first.getDay() + 6) % 7;

  const start = new Date(year, month, 1 - offset);

  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

export function Calendar({ range, onRangeChange, maxDate }: CalendarProps) {
  const initial = range.from ?? new Date();
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));

  const days = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const today = startOfDay(new Date());
  const limit = maxDate ? startOfDay(maxDate) : null;

  /*
    Click behaviour: the first click starts a new range, the second closes it.
    Clicking before the open start treats the earlier date as the new start
    rather than refusing it, which is what people expect when they realise they
    picked the wrong end first.
  */
  function handleSelect(day: Date) {
    const picked = startOfDay(day);

    if (!range.from || (range.from && range.to)) {
      onRangeChange({ from: picked, to: null });
      return;
    }

    if (picked < range.from) {
      onRangeChange({ from: picked, to: range.from });
      return;
    }

    onRangeChange({ from: range.from, to: picked });
  }

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <div className="w-64 select-none">
      {/* Month header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft size={15} />
        </button>

        <span className="text-xs font-semibold">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </span>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const disabled = limit ? day > limit : false;

          const isStart = sameDay(day, range.from);
          const isEnd = sameDay(day, range.to);
          const inRange =
            !!range.from &&
            !!range.to &&
            day > range.from &&
            day < range.to;

          const isEdge = isStart || isEnd;

          return (
            <button
              key={day.getTime()}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(day)}
              aria-label={day.toDateString()}
              aria-current={sameDay(day, today) ? 'date' : undefined}
              className={cn(
                'relative h-8 text-xs transition-colors',
                // The band is drawn on the cell itself so a continuous range
                // reads as one strip rather than a row of separate pills.
                inRange && 'bg-sidebar-primary/15',
                isStart && range.to && 'rounded-l-md',
                isEnd && 'rounded-r-md',
                !inRange && !isEdge && 'rounded-md',
                isEdge
                  ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground rounded-md'
                  : inMonth
                    ? 'text-foreground hover:bg-muted'
                    : 'text-muted-foreground/40 hover:bg-muted/60',
                disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                sameDay(day, today) && !isEdge && 'font-semibold text-sidebar-primary',
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
