// Shared table conventions.
//
// Every table in the app is built from these so the frame, header weight,
// row height and empty state match everywhere. The CRM grid needs its own
// column machinery, but it uses the same shell and the same band styling.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
  The frame each table sits in: rounded card, hairline border, its own scroll
  context so the sticky header clips to the rounded corners.
*/
export function TableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      {children}
    </div>
  );
}

// Uppercase micro-label used by every column header in the app.
export const TABLE_HEAD_CLASS =
  'h-10 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap';

/*
  The frame every wide (horizontally scrolling) table uses.

  max-h-full rather than h-full: with only a few rows, h-full stretched the
  card to the full viewport and left a large empty area below the last row,
  which read as a broken or half-loaded table. Sizing to content keeps the
  frame tight to the data and still caps at the available height.

  no-scrollbar hides the bars without disabling the scrolling itself — they
  were cutting across the rounded corners of the card.
*/
export const TABLE_CONTAINER_CLASS =
  'relative w-full max-h-full overflow-auto rounded-xl border bg-card no-scrollbar';

/*
  Group band.

  Filled with a gradient rather than a flat colour so the header has a little
  depth, with white text on top. Each band names a section of a wide grid.
*/
/*
  Bands.

  Positional shades, not colours. 1/2/3 use dark ink on a light grey; 4/5 use
  white ink on a darker grey. Legacy names are still accepted so the wide
  tables can be migrated one at a time and every group in the app ends up on
  the same neutral scale.
*/
export type BandTone =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 'identity'
  | 'crm'
  | 'opportunity'
  | 'hosting'
  | 'progress'
  | 'docs'
  | 'neutral';

const BAND_MAP: Record<Exclude<BandTone, number>, 1 | 2 | 3 | 4 | 5> = {
  identity: 1,
  crm: 4,
  opportunity: 3,
  hosting: 4,
  progress: 2,
  docs: 5,
  neutral: 3,
};

export function bandStyle(tone: BandTone): React.CSSProperties {
  const step = typeof tone === 'number' ? tone : BAND_MAP[tone];
  return {
    backgroundColor: `var(--band-${step})`,
    color: `var(--band-${step}-ink)`,
  };
}

export const BAND_CLASS =
  'text-center text-[11px] font-bold uppercase tracking-[0.1em] py-2';

/*
  Empty state.

  Rendered outside the row grid so it never picks up the row hover highlight —
  hovering "no results" should not look like something you can click.
*/
export function TableEmptyState({
  message = 'Nothing to show yet.',
  icon,
}: {
  message?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
