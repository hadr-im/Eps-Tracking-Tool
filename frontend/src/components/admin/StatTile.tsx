/*
  One completion figure — the LC, a department, a team.

  The three levels are the same measurement at different zooms, so they get
  one tile rather than three layouts. Everything is left-aligned in a column:
  the earlier version put the label and the percentage at opposite ends of a
  wide card, which left a hand's width of nothing between a number and the
  thing it described, and made the eye travel to pair them up.

  The bar runs the full width underneath. At a glance a column of these reads
  as a shape — which group is short — before any of the numbers are read.
*/

import { cn } from '@/lib/utils';
import type { CompletionRollup } from '@/types/admin';

/*
  Status, not series: this says whether a group is in good shape. The word is
  carried by the figure beside it, never by the colour alone — and the bar
  itself stays brand blue at every level, so the colour never implies that a
  low score is a different kind of measurement from a high one.
*/
function tone(rate: number): string {
  if (rate >= 75) return 'text-emerald-600';
  if (rate >= 40) return 'text-amber-600';
  return 'text-rose-600';
}

interface StatTileProps {
  row: CompletionRollup;
  /** The LC tile, which carries the headline figure. */
  emphasis?: boolean;
  className?: string;
}

export function StatTile({ row, emphasis = false, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-xl border bg-card p-4',
        emphasis && 'bg-gradient-to-br from-aiesec-blue/8 via-card to-card ring-1 ring-aiesec-blue/15',
        className,
      )}
    >
      <p
        className={cn(
          'truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        )}
      >
        {row.label}
      </p>

      <p
        className={cn(
          'mt-1 font-bold tabular-nums leading-none',
          emphasis ? 'text-4xl' : 'text-3xl',
          tone(row.rate),
        )}
      >
        {row.rate}
        <span className={cn('font-semibold', emphasis ? 'text-xl' : 'text-lg')}>%</span>
      </p>

      <div className={cn('mt-3 overflow-hidden rounded-full bg-muted', emphasis ? 'h-2' : 'h-1.5')}>
        <div
          className="h-full rounded-full bg-aiesec-blue transition-all duration-500"
          style={{ width: `${Math.min(row.rate, 100)}%` }}
        />
      </div>

      {/*
        The working behind the figure. Kept on one line and allowed to wrap
        as a whole, so a narrow tile never breaks "1 150/2 328" across lines
        and turns one number into two.
      */}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        <span className="whitespace-nowrap">
          {row.people} {row.people === 1 ? 'person' : 'people'}
        </span>
        {' · '}
        <span className="whitespace-nowrap">{row.epCount.toLocaleString()} EPs</span>
        {' · '}
        <span className="whitespace-nowrap">
          {row.filled.toLocaleString()}/{row.expected.toLocaleString()} fields
        </span>
      </p>
    </div>
  );
}
