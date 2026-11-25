/*
  Who is keeping their CRM best.

  A trophy, not a tile. Everything else on this page is a measurement and
  looks like one; this is the one element meant to be enjoyed, screenshotted
  and read out in a meeting, so it is the one element allowed to be loud.

  Deep gold rather than pastel: the pale version read as a disabled state or
  a warning banner, which is the opposite of a prize. The field runs from
  burnt amber on the left to a warmer gold on the right, and the text sits on
  the dark half where white has seven-to-one contrast against it. The one
  thing crossing into the light end is the percentage, which is large enough
  to need only three-to-one.

  The sparkles are scattered by hand with their own delays and durations.
  A field of them on a shared timer blinks in unison, which is the giveaway
  of a cheap effect; staggered, it reads as light catching on metal. They
  carry nothing, so reduced-motion simply stills them.
*/

import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/layout/UserAvatar';
import type { Champion } from '@/types/admin';

/*
  A four-point glint. Drawn rather than taken from the icon set because a
  sparkle wants concave sides — a star with straight edges reads as a badge,
  and at twelve pixels an icon's stroke turns to mush.
*/
function Sparkle({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} style={style}>
      <path
        d="M12 0c.6 6.4 5 10.8 12 12-7 1.2-11.4 5.6-12 12-.6-6.4-5-10.8-12-12C7 10.8 11.4 6.4 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Position, size, and its own rhythm — so no two glint together.
const SPARKLES = [
  { top: '14%', left: '22%', size: 10, delay: '0s', duration: '2.6s', opacity: 0.9 },
  { top: '62%', left: '31%', size: 7, delay: '0.9s', duration: '3.4s', opacity: 0.7 },
  { top: '26%', left: '47%', size: 13, delay: '1.6s', duration: '3s', opacity: 0.8 },
  { top: '74%', left: '56%', size: 8, delay: '0.4s', duration: '2.8s', opacity: 0.6 },
  { top: '18%', left: '68%', size: 11, delay: '2.1s', duration: '3.6s', opacity: 0.85 },
  { top: '56%', left: '77%', size: 9, delay: '1.2s', duration: '2.4s', opacity: 0.7 },
  { top: '34%', left: '88%', size: 14, delay: '0.2s', duration: '3.2s', opacity: 0.75 },
  { top: '80%', left: '92%', size: 7, delay: '2.5s', duration: '2.9s', opacity: 0.6 },
];

interface ChampionCardProps {
  champions?: Champion[];
  isLoading: boolean;
}

export function ChampionCard({ champions = [], isLoading }: ChampionCardProps) {
  if (isLoading) {
    return <Skeleton className="h-36 w-full rounded-xl" />;
  }

  const many = champions.length > 1;

  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-lg shadow-amber-900/20"
      style={{
        background:
          'linear-gradient(108deg, #6B2E0B 0%, #8A4209 26%, #AE5C08 55%, #D08A14 100%)',
      }}
    >
      {/* A broad highlight across the top, so the field reads as metal rather than paint. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 18% -30%, rgba(255,240,200,0.30) 0%, transparent 60%)',
        }}
      />

      {/* The oversized trophy, clipped by the card — scenery, not an icon. */}
      <Trophy
        aria-hidden
        className="pointer-events-none absolute -right-10 -bottom-14 h-56 w-56 text-amber-200/15"
        strokeWidth={1}
      />

      {SPARKLES.map((s, i) => (
        <Sparkle
          key={i}
          aria-hidden
          className="animate-twinkle pointer-events-none absolute text-amber-100"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
            opacity: s.opacity,
          }}
        />
      ))}

      <div className="relative flex flex-wrap items-center gap-x-8 gap-y-5 px-5 py-6 sm:px-7">
        {champions.length === 0 ? (
          <p className="text-sm text-amber-100/80">
            Nobody has EPs to be scored on in this period yet.
          </p>
        ) : (
          champions.map((c) => (
            <div key={c.userId} className="flex min-w-0 items-center gap-5">
              {/*
                Large enough to be a portrait rather than a bullet point —
                this is a person being singled out, and at forty-four pixels
                they were a thumbnail beside their own name. The double ring
                lifts the photo off the gold without a hard edge.
              */}
              <UserAvatar
                fullName={c.fullName}
                avatarUrl={c.avatarUrl}
                className="h-20 w-20 shrink-0 ring-4 ring-amber-200/40 ring-offset-2 ring-offset-amber-900/40 sm:h-24 sm:w-24"
              />

              <div className="min-w-0">
                <p className="truncate text-xl font-bold leading-tight text-white drop-shadow-sm sm:text-2xl">
                  {c.fullName}
                </p>
                {c.department && (
                  <span className="mt-2 inline-flex rounded-md bg-amber-50/20 px-2 py-0.5 text-[11px] font-bold tracking-wide text-amber-50 ring-1 ring-amber-100/25">
                    {c.department}
                  </span>
                )}
              </div>

              <p className="shrink-0 text-5xl font-black leading-none tabular-nums text-white drop-shadow-sm sm:text-6xl">
                {c.rate}
                <span className="text-2xl font-bold sm:text-3xl">%</span>
              </p>
            </div>
          ))
        )}
      </div>

      {/*
        The title sits top right, out of the way of the face and the figure.
        It is the label on a prize rather than a section heading, so it is
        set in the pale end of the same gold on a translucent plate — the
        card's own colour, not a new one.

        Static on a phone, where there is no right-hand margin to spare and
        it belongs above the name instead.
      */}
      <div className="absolute top-4 right-4 hidden items-center gap-2 rounded-full bg-amber-950/25 px-3.5 py-1.5 ring-1 ring-amber-100/20 backdrop-blur-sm sm:flex">
        <Trophy size={16} className="text-amber-200" />
        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-amber-100">
          {many ? 'Data champions' : 'Data champion'}
        </span>
      </div>

      <div className="relative flex items-center gap-2 px-5 pb-4 sm:hidden">
        <Trophy size={14} className="text-amber-200" />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-100">
          {many ? 'Data champions' : 'Data champion'}
        </span>
      </div>
    </div>
  );
}
