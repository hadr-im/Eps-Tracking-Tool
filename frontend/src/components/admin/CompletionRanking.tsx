/*
  People ranked by completion, with the question chosen from a dropdown.

  It was two fixed cards, best ten and worst ten, which answered the two
  questions nobody needed help with. The useful question is usually "who is
  under half" — a list whose length is itself the answer, and which neither
  fixed card could show.

  Ranked bars, not a pie: this compares magnitudes across named people, and
  "who is where" is what bars answer precisely.

  One hue, because there is one measure. Colouring by rank would be the
  classic mistake here — it would claim a 71% is a different kind of thing
  from a 69%, when the only difference is a position in a list that changes
  every week. The figure at the end of the row is more precise than any
  colour could be.
*/

import { useMemo, useState } from 'react';
import { ListFilter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { departmentColor } from '@/lib/departmentColor';
import { DepartmentBadge } from './DepartmentBadge';
import type { CompletionRow } from '@/types/admin';

type Mode = 'top10' | 'least10' | 'below50' | 'above50';

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'top10', label: 'Top 10', hint: 'Highest completion in this period' },
  { value: 'least10', label: 'Least 10', hint: 'Lowest completion in this period' },
  { value: 'below50', label: 'Below 50%', hint: 'Everyone under half, lowest first' },
  { value: 'above50', label: 'Above 50%', hint: 'Everyone at half or better, highest first' },
];

interface CompletionRankingProps {
  people?: CompletionRow[];
  isLoading: boolean;
}

export function CompletionRanking({ people = [], isLoading }: CompletionRankingProps) {
  const [mode, setMode] = useState<Mode>('top10');

  const rows = useMemo(() => {
    /*
      Only people with something to be scored on are ranked. Someone holding
      no EPs is on 0% by arithmetic rather than conduct, and letting those
      fill the bottom of the list would bury the people who are actually
      behind — which is the whole point of looking.
    */
    const ranked = people.filter((p) => p.expected > 0);
    const desc = [...ranked].sort((a, b) => b.rate - a.rate || b.epCount - a.epCount);
    const asc = [...desc].reverse();

    if (mode === 'top10') return desc.slice(0, 10);
    if (mode === 'least10') return asc.slice(0, 10);
    if (mode === 'below50') return asc.filter((p) => p.rate < 50);
    return desc.filter((p) => p.rate >= 50);
  }, [people, mode]);

  const meta = MODES.find((m) => m.value === mode)!;
  // A threshold list is as long as it is; its length is part of the answer.
  const isThreshold = mode === 'below50' || mode === 'above50';

  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ListFilter size={15} className="text-muted-foreground" />
              Ranking
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {meta.hint}
              {isThreshold && ` · ${rows.length} ${rows.length === 1 ? 'person' : 'people'}`}
            </p>
          </div>

          <Select value={mode} onValueChange={(v) => v && setMode(v as Mode)}>
            <SelectTrigger
              className="h-9 w-36 rounded-lg border border-border bg-card text-xs font-medium"
              aria-label="Which slice of the ranking to show"
            >
              <SelectValue>
                {(v) => MODES.find((m) => m.value === v)?.label ?? 'Top 10'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="text-xs">
              {MODES.map((m) => (
                <SelectItem key={m.value} value={m.value} label={m.label}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {mode === 'below50'
              ? 'Nobody is under half. '
              : mode === 'above50'
                ? 'Nobody is at half yet.'
                : 'Nobody has EPs to be scored on yet.'}
          </p>
        ) : (
          /*
            A threshold list can run to most of the committee, so it scrolls
            inside the card rather than pushing the rest of the page down.
            The fixed tens never need it.
          */
          <ol
            className={cn(
              'space-y-2.5',
              isThreshold &&
                'max-h-[28rem] overflow-y-auto pr-1 [scrollbar-width:thin]',
            )}
          >
            {rows.map((r, i) => (
              <li key={r.userId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate font-medium">{r.fullName}</span>
                    <DepartmentBadge department={r.department} />
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold">{r.rate}%</span>
                </div>

                {/*
                  Indented to line up with the name, so the eye can run down
                  the left edge of the bars and read the ranking as a shape
                  rather than as twenty separate numbers.
                */}
                <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(r.rate, 100)}%`,
                      backgroundColor: departmentColor(r.department),
                    }}
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
