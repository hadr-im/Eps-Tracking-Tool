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
import { departmentColor, departmentTint } from '@/lib/departmentColor';
import { DepartmentBadge } from './DepartmentBadge';
import type { CompletionRow } from '@/types/admin';

const ALL = '__all__';

// Two letters from the leader's name, the same way the app's avatars read.
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

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
            A card per team, led by the person who runs it.

            The avatar is the point of the redesign. A team is known by its
            leader, and a column of names set in the same weight as every
            other label made eight teams read as eight table rows — the eye
            had nothing to land on. An initialled circle gives each card an
            anchor — tinted with its department, which the badge beside it
            names.

            The ring around the percentage is the completion itself, drawn
            with conic-gradient: at a glance the shape of the ring is the
            figure, and the number inside it is there for when the glance is
            not enough. It is also the one place on this page where a
            measure can be read without a straight bar, which is what keeps
            the teams from looking like a second ranking.
          */
          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
            {teams.map((t) => {
              const colour = departmentColor(t.department);
              return (
                <div
                  key={t.leader}
                  className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/20"
                >
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: departmentTint(t.department, 14), color: colour }}
                  >
                    {initials(t.leader)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{t.leader}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <DepartmentBadge department={t.department} />
                      <span>
                        {t.people} {t.people === 1 ? 'member' : 'members'}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{t.epCount.toLocaleString()} EPs</span>
                    </p>
                  </div>

                  {/*
                    The ring is decorative; the figure inside it is the
                    accessible reading, which is why the number is never
                    omitted however clear the shape looks.
                  */}
                  <div
                    className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(${colour} ${Math.min(t.rate, 100) * 3.6}deg, var(--color-muted) 0deg)`,
                    }}
                    aria-hidden
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-card text-xs font-bold tabular-nums">
                      {Math.round(t.rate)}%
                    </span>
                  </div>
                  <span className="sr-only">{t.rate}% complete</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
