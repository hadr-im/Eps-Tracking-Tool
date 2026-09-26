// SoftBadge — the one badge style used across the app.
//
// Tinted background, matching text, no border, no icon. Defined once so
// status pills, role chips and counters cannot drift into different shapes
// and weights on different screens.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SoftBadgeTone =
  | 'neutral'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'dispatcher';

const TONES: Record<SoftBadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  blue: 'bg-aiesec-blue/10 text-aiesec-blue',
  green: 'bg-emerald-500/10 text-emerald-600',
  amber: 'bg-amber-500/10 text-amber-600',
  red: 'bg-destructive/10 text-destructive',
  // Outside the product palette on purpose — see --dispatcher in index.css
  dispatcher: 'bg-dispatcher/10 text-dispatcher',
};

interface SoftBadgeProps {
  children: ReactNode;
  tone?: SoftBadgeTone;
  className?: string;
}

export function SoftBadge({ children, tone = 'neutral', className }: SoftBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap',
        // Small radius to match the app's card / input rounding. A pill shape
        // read as a separate widget rather than a caption on the data.
        'rounded-sm px-2 py-0.5 text-[11px] font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
