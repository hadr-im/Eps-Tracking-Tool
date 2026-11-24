/*
  Who is keeping their CRM best, over the chosen period.

  A banner rather than a row of the table, because this is the one number on
  the page meant to be read out loud in a meeting. Ties are shown together:
  two people on 97.4% are both the champion, and picking one by name order
  would be a quiet lie the page tells every week.
*/

import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { SoftBadge } from '@/components/ui/soft-badge';
import type { Champion, AdminPeriod } from '@/types/admin';

const PERIOD_LABEL: Record<AdminPeriod, string> = {
  week: 'this week',
  month: 'this month',
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
        <CardContent className="flex items-center gap-4 py-5">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const many = champions.length > 1;

  return (
    <Card className="border bg-gradient-to-br from-aiesec-blue/8 via-card to-card">
      <CardContent className="py-5">
        <div className="mb-3 flex items-center gap-2">
          <Trophy size={15} className="text-amber-500" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {many ? 'Data champions' : 'Data champion'} — {PERIOD_LABEL[period]}
          </h2>
        </div>

        {champions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody has EPs to be scored on in this period yet.
          </p>
        ) : (
          /*
            Wraps rather than scrolls. A tie is usually two or three people,
            and on a phone they stack; a row that scrolled sideways would
            hide the very names this card exists to show.
          */
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {champions.map((c) => (
              <div key={c.userId} className="flex min-w-0 items-center gap-3">
                <UserAvatar fullName={c.fullName} avatarUrl={null} className="h-11 w-11 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.fullName}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    {c.department && <SoftBadge tone="blue">{c.department}</SoftBadge>}
                    <span>{c.epCount} EP{c.epCount === 1 ? '' : 's'}</span>
                  </p>
                </div>
                <span className="ml-1 shrink-0 text-2xl font-bold tabular-nums text-aiesec-blue">
                  {c.rate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
