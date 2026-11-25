/*
  Who is keeping their CRM best.

  Everything else on this page is a measurement and looks like one. This is
  the element meant to be enjoyed and read out in a meeting, so it is the
  one allowed to be loud — but loud is not the same as bright. The first
  attempt ran burnt orange into amber and came out the colour of gravy: at
  those saturations gold stops reading as metal and starts reading as rust.

  So it is dark. Espresso at the left, warming through bronze to an old
  gold at the right, which is how gilding actually behaves — the light is
  somewhere, not everywhere. White sits comfortably on all of it, the
  sparks have something to be bright against, and the photograph is the
  lightest thing in the frame, which is the point.

  The heading is set in the brand face at the size the app greets you with
  in the header. It is a title, not a status, so it is not a pill.
*/

import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/layout/UserAvatar';
import type { Champion } from '@/types/admin';

/*
  A four-point glint. Drawn rather than taken from the icon set because a
  spark wants concave sides — straight edges read as a badge — and at ten
  pixels an icon's stroke turns to mush.
*/
function Spark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} style={style}>
      <path
        d="M12 0c.6 6.4 5 10.8 12 12-7 1.2-11.4 5.6-12 12-.6-6.4-5-10.8-12-12C7 10.8 11.4 6.4 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

/*
  Where each spark starts, how big it is, and its own rhythm.

  They cover the right-hand 60% of the banner, from just past the figure to
  the far edge. Spread over that much width they need to be more numerous
  or the field reads as a few stray dots rather than as something catching
  light — so there are fourteen, and they get smaller and sparser toward
  the left where they approach the text.

  `bottom` is negative so each is already travelling when it fades in,
  rather than appearing to switch on at the card's edge.
*/
const SPARKS = [
  { left: '41%', bottom: '-8px', size: 5, delay: '2.2s', duration: '5.6s', drift: '-8px' },
  { left: '45%', bottom: '-14px', size: 6, delay: '4.4s', duration: '5s', drift: '10px' },
  { left: '49%', bottom: '-6px', size: 5, delay: '1.1s', duration: '6s', drift: '-6px' },
  { left: '54%', bottom: '-16px', size: 8, delay: '3.1s', duration: '4.6s', drift: '12px' },
  { left: '58%', bottom: '-10px', size: 6, delay: '0.5s', duration: '5.4s', drift: '-11px' },
  { left: '62%', bottom: '-18px', size: 9, delay: '2.7s', duration: '4.2s', drift: '7px' },
  { left: '66%', bottom: '-7px', size: 7, delay: '4.9s', duration: '5.2s', drift: '-14px' },
  { left: '70%', bottom: '-14px', size: 10, delay: '1.6s', duration: '4.8s', drift: '9px' },
  { left: '75%', bottom: '-9px', size: 7, delay: '3.8s', duration: '5.8s', drift: '-9px' },
  { left: '79%', bottom: '-19px', size: 12, delay: '0s', duration: '4.4s', drift: '13px' },
  { left: '84%', bottom: '-11px', size: 8, delay: '2.4s', duration: '5.1s', drift: '-15px' },
  { left: '88%', bottom: '-16px', size: 10, delay: '4.1s', duration: '4s', drift: '11px' },
  { left: '92%', bottom: '-6px', size: 6, delay: '1.3s', duration: '5.5s', drift: '-7px' },
  { left: '96%', bottom: '-20px', size: 11, delay: '3.4s', duration: '4.7s', drift: '8px' },
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
      className="relative overflow-hidden rounded-xl ring-1 ring-[#E3B23C]/60"
      style={{
        /*
          Champagne: a warm paper rather than a sheet of metal.

          Every bright gold we tried ran into the same wall. Gold is a
          light colour, so a field of it is luminous, and a luminous field
          both glares and leaves white text at around 1.6:1. Darkening it
          far enough for white turns it to mustard. There was no bright,
          calm, white-on-gold answer to find — so the ink goes dark and the
          field goes pale, which is how gilt-edged stationery has always
          worked.

          Deep bronze on this clears 10:1, the gold moves into the border,
          the sparks and the ring where it can be fully saturated without
          filling the eye, and the photograph stays the brightest thing in
          the frame.

          The gradient is barely there on purpose: a touch deeper toward
          the sparks, so the surface looks warmed rather than printed.
        */
        background: 'linear-gradient(101deg, #FEF7E4 0%, #FDF1D2 52%, #F9E4B0 100%)',
      }}
    >
      {SPARKS.map((s, i) => (
        <Spark
          key={i}
          className="animate-spark-rise pointer-events-none absolute text-[#D9A520]"
          style={
            {
              // A warm bloom rather than a white one — on a pale field a
              // white glow is invisible, and the point of a spark is that
              // it looks lit.
              filter: 'drop-shadow(0 0 4px rgba(217,165,32,0.55))',
              left: s.left,
              bottom: s.bottom,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
              '--drift': s.drift,
            } as React.CSSProperties
          }
        />
      ))}

      <div className="relative px-5 py-6 sm:px-7">
        {champions.length === 0 ? (
          <>
            <h2 className="sr-only">Data champion</h2>
            <p className="text-sm text-[#6B5214]">
              Nobody has EPs to be scored on in this period yet.
            </p>
          </>
        ) : (
          /*
            One full-width row per champion, so a tie reads as two equal
            entries rather than two things crowded onto one line. Each row
            is portrait, then the stack of who they are, then the figure
            pushed to the far edge — the two things worth reading sit at
            opposite ends with nothing between them to scan past.
          */
          <div className="flex flex-col gap-6">
            {champions.map((c) => (
              <div key={c.userId} className="flex items-center gap-5">
                {/*
                  The photograph is the brightest thing in the frame and the
                  largest — this is a person being singled out, and at the
                  size of a table avatar they were a bullet point beside
                  their own name.
                */}
                <UserAvatar
                  fullName={c.fullName}
                  avatarUrl={c.avatarUrl}
                  className="h-20 w-20 shrink-0 ring-2 ring-[#E3B23C] ring-offset-2 ring-offset-[#FEF7E4] sm:h-24 sm:w-24"
                />

                <div className="min-w-0 flex-1">
                  {/*
                    The brand face, as in the header's greeting. It names
                    the thing without announcing itself as a section
                    heading, which a pill or an uppercase label would.
                  */}
                  <h2
                    className="text-lg leading-none text-[#B07E10] sm:text-xl"
                    style={{ fontFamily: 'var(--font-brand)' }}
                  >
                    {many ? 'Data champions' : 'Data champion'}
                  </h2>

                  <p
                    className="mt-2 truncate text-xl font-bold leading-tight text-[#4A3708] sm:text-2xl"
                  >
                    {c.fullName}
                  </p>

                  {c.department && (
                    <span className="mt-2 inline-flex rounded-md bg-[#E3B23C]/25 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#6B5214] ring-1 ring-[#C9971F]/40">
                      {c.department}
                    </span>
                  )}
                </div>

                <p
                  className="shrink-0 text-5xl font-black leading-none tabular-nums text-[#4A3708] sm:text-6xl"
                >
                  {c.rate}
                  <span className="text-2xl font-bold text-[#B07E10] sm:text-3xl">%</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
