/*
  Who is keeping their CRM best, over the chosen period.

  A banner rather than a row of the table, because this is the one figure on
  the page meant to be read out in a meeting.

  Ties are shown together: two people on 97.4% are both the champion, and
  picking one by name order would be a quiet lie the page tells every week.

  The runners-up sit on the right. They are there partly because second and
  third are worth knowing, and partly because without them the banner was a
  name in the top-left corner of an otherwise empty strip — the width was
  being spent on nothing. They are deliberately quieter than the champion:
  smaller, no avatar, one line each.
*/

import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { SoftBadge } from '@/components/ui/soft-badge';
import type { Champion, AdminPeriod, CompletionRow } from '@/types/admin';

const PERIOD_LABEL: Record<AdminPeriod, string> = {
  week: 'last 7 days',
  month: 'last 30 days',
  all: 'all time',
};

interface ChampionCardProps {
  champions?: Champion[];
  /** The ranking, so the next few places can be shown beside the winner. */
  ranking?: CompletionRow[];
  period: AdminPeriod;
  isLoading: boolean;
}

export function ChampionCard({
  champions = [],
  ranking = [],
  period,
  isLoading,
}: ChampionCardProps) {
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
  const championIds = new Set(champions.map((c) => c.userId));
  // The next three distinct people below whoever is tied at the top.
  const runnersUp = ranking.filter((r) => !championIds.has(r.userId)).slice(0, 3);

  return (
    <Card className="overflow-hidden border bg-gradient-to-br from-aiesec-blue/10 via-card to-card">
      <CardContent className="py-5">
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
          /*
            One column on a phone, two from lg: the winner keeps the room on
            the left and the runners-up stack underneath rather than being
            squeezed into a column too narrow for a name.
          */
          <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
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

            {runnersUp.length > 0 && (
              <div className="min-w-0 border-t pt-4 lg:min-w-56 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Close behind
                </p>
                <ol className="space-y-1.5">
                  {runnersUp.map((r, i) => (
                    <li key={r.userId} className="flex items-baseline gap-2 text-xs">
                      <span className="w-3 shrink-0 text-right tabular-nums text-muted-foreground">
                        {i + 2}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.fullName}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{r.rate}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
