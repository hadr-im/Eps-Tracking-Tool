/*
  Who is keeping their CRM best, over the chosen period.

  A banner rather than a row of the table, because this is the one figure on
  the page meant to be read out in a meeting.

  Ties are shown together: two people on 97.4% are both the champion, and
  picking one by name order would be a quiet lie the page tells every week.

  The width that leaves is given to the card rather than filled: a single
  name and one large figure, with the tint doing the work of making the
  strip feel occupied.
*/

import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { SoftBadge } from '@/components/ui/soft-badge';
import type { Champion, AdminPeriod } from '@/types/admin';

const PERIOD_LABEL: Record<AdminPeriod, string> = {
  week: 'last 7 days',
  month: 'last 30 days',
  all: 'all time',
};

interface ChampionCardProps {
  champions?: Champion[];
  period: AdminPeriod;
  isLoading: boolean;
}

export function ChampionCard({ champions = [], period, isLoading }: ChampionCardProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardContent className="flex flex-wrap items-center gap-6 py-6">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-16 w-56 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const many = champions.length > 1;

  return (
    /*
      The tint is a layer of its own rather than a background utility on the
      card.

      `from-aiesec-blue/10 via-card to-card` spread a tenth of the brand blue
      across the whole width and read as a grubby off-white — a wash with no
      direction, which is what a gradient looks like when its two ends are
      nearly the same colour. This is a radial fall-off anchored at the top
      left, strong where the trophy sits and gone by the middle, so it reads
      as light coming from somewhere rather than as a tinted rectangle.

      Painted in an absolutely positioned child so it cannot interact with
      the card's own border or ring, and marked aria-hidden since it carries
      nothing.
    */
    <Card className="relative overflow-hidden border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_140%_at_0%_0%,var(--chart-blue)_0%,transparent_55%)] opacity-[0.12]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-[var(--chart-blue)] opacity-[0.07] blur-3xl"
      />

      <CardContent className="relative py-5">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="shrink-0 text-amber-500" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {many ? 'Data champions' : 'Data champion'}
          </h2>
          <SoftBadge tone="neutral" className="text-[10px]">
            {PERIOD_LABEL[period]}
          </SoftBadge>
        </div>

        {champions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nobody has EPs to be scored on in this period yet.
          </p>
        ) : (
          <div className="mt-4">
            {/* Wraps rather than scrolls, so a tie stacks on a phone. */}
            <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
              {champions.map((c) => (
                <div key={c.userId} className="flex min-w-0 items-center gap-3.5">
                  <UserAvatar
                    fullName={c.fullName}
                    avatarUrl={null}
                    className="h-14 w-14 shrink-0 ring-2 ring-aiesec-blue/20"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold leading-tight">{c.fullName}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      {c.department && <SoftBadge tone="blue">{c.department}</SoftBadge>}
                      <span>
                        {c.epCount} EP{c.epCount === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  <p className="ml-2 shrink-0 text-4xl font-bold leading-none tabular-nums text-aiesec-blue">
                    {c.rate}
                    <span className="text-xl font-semibold">%</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
