/*
  Teams, ranked, filtered by department.

  Built from the same per-user rows as everything else rather than from the
  server's team rollup, because a team needs to know which department it
  belongs to before it can be filtered by one — and a rollup that is only a
  label and a rate cannot say. Summing here also guarantees the teams cannot
  disagree with the people inside them.

  A team is its leader. Members with no leader are not a team and are left
  out rather than bundled into an "unassigned" row that nobody owns.
*/

import { useMemo, useState } from 'react';
import { Users2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { departmentColor } from '@/lib/departmentColor';
import { DepartmentBadge } from './DepartmentBadge';
import type { CompletionRow } from '@/types/admin';

const ALL = '__all__';

interface TeamSummary {
  leader: string;
  department: string | null;
  people: number;
  epCount: number;
  filled: number;
  expected: number;
  rate: number;
}

interface TeamsPanelProps {
  people?: CompletionRow[];
  departments?: string[];
  isLoading: boolean;
}

export function TeamsPanel({ people = [], departments = [], isLoading }: TeamsPanelProps) {
  const [dept, setDept] = useState<string>(ALL);

  const teams = useMemo<TeamSummary[]>(() => {
    const byLeader = new Map<string, CompletionRow[]>();
    for (const p of people) {
      if (!p.teamLeaderName) continue;
      byLeader.set(p.teamLeaderName, [...(byLeader.get(p.teamLeaderName) ?? []), p]);
    }

    return [...byLeader.entries()]
      .map(([leader, members]) => {
        const expected = members.reduce((s, m) => s + m.expected, 0);
        const filled = members.reduce((s, m) => s + m.filled, 0);
        return {
          leader,
          // A team sits in one department in practice; the first member's is
          // the team's.
          department: members.find((m) => m.department)?.department ?? null,
          people: members.length,
          epCount: members.reduce((s, m) => s + m.epCount, 0),
          filled,
          expected,
          rate: expected === 0 ? 0 : Math.round((filled / expected) * 1000) / 10,
        };
      })
      .filter((t) => dept === ALL || t.department === dept)
      .sort((a, b) => b.rate - a.rate);
  }, [people, dept]);

  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
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
              <Users2 size={15} className="text-muted-foreground" />
              Teams
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              By team leader · {teams.length} {teams.length === 1 ? 'team' : 'teams'}
            </p>
          </div>

          <Select value={dept} onValueChange={(v) => v && setDept(String(v))}>
            <SelectTrigger
              className="h-9 w-36 rounded-lg border border-border bg-card text-xs font-medium"
              aria-label="Which department's teams to show"
            >
              <SelectValue>{(v) => (v === ALL ? 'All departments' : String(v))}</SelectValue>
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value={ALL} label="All departments">
                All departments
              </SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d} label={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {teams.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {dept === ALL ? 'No teams set up yet.' : `No teams in ${dept}.`}
          </p>
        ) : (
          /*
            Cards, not a ranked list. A team is a thing with a name, a size
            and a department — several facts that want their own line — and
            a row of bars flattened all of that into one. The grid also
            stops a list of eight from running down a column half the page
            tall beside a ranking that is ten rows long.
          */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {teams.map((t) => (
              <div
                key={t.leader}
                className="relative overflow-hidden rounded-xl border bg-card p-3.5"
              >
                {/* The department reads off the card's own edge. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: departmentColor(t.department) }}
                />

                <div className="flex items-start justify-between gap-2 pl-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight">{t.leader}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <DepartmentBadge department={t.department} />
                      <span>
                        {t.people} {t.people === 1 ? 'member' : 'members'}
                      </span>
                      <span>·</span>
                      <span>{t.epCount.toLocaleString()} EPs</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xl font-bold leading-none tabular-nums">
                    {t.rate}
                    <span className="text-sm font-semibold">%</span>
                  </span>
                </div>

                <div className="mt-3 ml-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-aiesec-blue transition-all duration-500"
                    style={{ width: `${Math.min(t.rate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
