/*
  The ten best and the ten most behind.

  Ranked bars, not a pie: this is a comparison of magnitudes across named
  people, and the thing being asked of it is "who is where", which bars
  answer precisely and a ring does not.

  One hue, because there is one measure. Colour by rank would be the classic
  mistake here — it would say a 71% is a different *kind* of thing from a
  69%, when the only difference is position in a list that changes weekly.
  The number sits at the end of each bar instead, which is more precise than
  any colour could be.
*/

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CompletionRow } from '@/types/admin';
import type { LucideIcon } from 'lucide-react';

interface CompletionRankingProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  rows?: CompletionRow[];
  isLoading: boolean;
  /** Low scores are drawn in a warning tone so the two cards cannot be confused. */
  tone?: 'good' | 'attention';
}

export function CompletionRanking({
  title,
  subtitle,
  icon: Icon,
  rows = [],
  isLoading,
  tone = 'good',
}: CompletionRankingProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const fill = tone === 'good' ? 'bg-aiesec-blue' : 'bg-amber-500';

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={15} className="text-muted-foreground" />
          {title}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nobody has EPs to be scored on yet.
          </p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.userId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="w-4 shrink-0 text-right tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate font-medium">{r.fullName}</span>
                    {r.department && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {r.department}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold">{r.rate}%</span>
                </div>

                {/*
                  The bar is indented to line up with the name, so the eye can
                  run down the left edge of the bars and read the ranking as a
                  shape rather than as twenty separate numbers.
                */}
                <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', fill)}
                    style={{ width: `${Math.min(r.rate, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
