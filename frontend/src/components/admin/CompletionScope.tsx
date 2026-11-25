/*
  Completion for one scope at a time — the whole LC, or a single department.

  Four tiles side by side made the reader compare percentages that are not
  really comparable: GTE's 30% is sixteen people and 189 EPs against GTA's
  27 and 614, and a row of equals invites you to read them as a league
  table. One scope at a time, chosen deliberately, asks the question the
  admin actually has: how is this group doing.

  The room that frees goes to the per-field breakdown, which is the part
  worth acting on. A department on 35% because nobody writes notes needs a
  different conversation from one on 35% because no CVs are being collected,
  and the headline figure cannot tell them apart.
*/

import { useMemo, useState } from 'react';
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
import { SCORED_FIELDS } from '@/types/admin';
import type { CompletionRollup, CompletionRow } from '@/types/admin';

const LC = '__lc__';

function tone(rate: number): string {
  if (rate >= 75) return 'text-emerald-600';
  if (rate >= 40) return 'text-amber-600';
  return 'text-rose-600';
}

interface CompletionScopeProps {
  lc?: CompletionRollup;
  departments?: CompletionRollup[];
  people?: CompletionRow[];
  isLoading: boolean;
}

export function CompletionScope({
  lc,
  departments = [],
  people = [],
  isLoading,
}: CompletionScopeProps) {
  const [scope, setScope] = useState<string>(LC);

  const rollup = scope === LC ? lc : departments.find((d) => d.label === scope);

  /*
    Summed from the same per-user rows the table shows, so the breakdown can
    never disagree with the people inside it. Weighted by field count rather
    than by averaging each person's percentage — someone holding two EPs
    should not move a department as far as someone holding eighty.
  */
  const byField = useMemo(() => {
    const inScope = scope === LC ? people : people.filter((p) => p.department === scope);
    return SCORED_FIELDS.map((f) => {
      const filled = inScope.reduce((s, p) => s + (p.byField[f.key]?.filled ?? 0), 0);
      const expected = inScope.reduce((s, p) => s + (p.byField[f.key]?.expected ?? 0), 0);
      return {
        ...f,
        filled,
        expected,
        rate: expected === 0 ? 0 : Math.round((filled / expected) * 1000) / 10,
      };
    });
  }, [people, scope]);

  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Data completion</CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {rollup
                ? `${rollup.people} ${rollup.people === 1 ? 'person' : 'people'} · ${rollup.epCount.toLocaleString()} EPs · ${rollup.filled.toLocaleString()}/${rollup.expected.toLocaleString()} fields filled`
                : 'Nothing recorded for this group yet'}
            </p>
          </div>

          <Select value={scope} onValueChange={(v) => v && setScope(String(v))}>
            <SelectTrigger
              className="h-9 w-40 rounded-lg border border-border bg-card text-xs font-medium"
              aria-label="Which group the figures cover"
            >
              <SelectValue>
                {(v) => (v === LC ? 'Whole LC' : String(v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value={LC} label="Whole LC">
                Whole LC
              </SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.label} value={d.label} label={d.label}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/*
          Headline and breakdown side by side from lg: the figure is what you
          glance at, the six bars are what you read, and stacking them put
          the thing worth reading below the fold on a laptop.
        */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-10">
          <div>
            <p className={cn('text-5xl font-bold leading-none tabular-nums', tone(rollup?.rate ?? 0))}>
              {rollup?.rate ?? 0}
              <span className="text-2xl font-semibold">%</span>
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-aiesec-blue transition-all duration-500"
                style={{ width: `${Math.min(rollup?.rate ?? 0, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              of the fields that were expected across {scope === LC ? 'the LC' : scope}
            </p>
          </div>

          <div>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Field by field
            </p>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {byField.map((f) => (
                <li key={f.key} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate">{f.label}</span>
                    <span className="shrink-0 tabular-nums font-medium">
                      {f.expected === 0 ? '—' : `${f.rate}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-aiesec-blue/70 transition-all duration-500"
                      style={{ width: `${Math.min(f.rate, 100)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {f.filled.toLocaleString()}/{f.expected.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
