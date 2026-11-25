/*
  Everyone, with the figure behind their score.

  A rate on its own tells an admin that someone is behind but not what to say
  to them, so each row carries the per-field tally too: a member on 55% who
  has filled every phase and no CV links needs a different conversation from
  one who has filled nothing. The columns are the six scored fields, in the
  order the CRM asks for them.

  Two renderings of the same rows — a table from md up, cards below. The same
  split the rest of the app uses; a six-column table on a phone is a
  horizontal scroll nobody reads.
*/

import { useMemo, useState } from 'react';
import { ArrowUpDown, Search, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationBar } from '@/components/ui/pagination-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DepartmentBadge } from './DepartmentBadge';
import { SCORED_FIELDS } from '@/types/admin';
import type { CompletionRow } from '@/types/admin';

type SortKey = 'rate' | 'name' | 'eps';

// Fixed, as asked: every page is twenty rows.
const PAGE_SIZE = 20;

const ALL_DEPTS = '__all__';

interface CompletionTableProps {
  rows?: CompletionRow[];
  departments?: string[];
  isLoading: boolean;
}

// Mirrors the funnel's reading of "good": green only once it is genuinely
// good, amber for the middle, muted for nothing to say.
function rateTone(rate: number, expected: number): string {
  if (expected === 0) return 'text-muted-foreground';
  if (rate >= 75) return 'text-emerald-600';
  if (rate >= 40) return 'text-amber-600';
  return 'text-rose-600';
}

function pct(f: { filled: number; expected: number }): string {
  if (f.expected === 0) return '—';
  return `${Math.round((f.filled / f.expected) * 100)}%`;
}

export function CompletionTable({
  rows = [],
  departments = [],
  isLoading,
}: CompletionTableProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('rate');
  const [page, setPage] = useState(1);
  const [dept, setDept] = useState<string>(ALL_DEPTS);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scoped = dept === ALL_DEPTS ? rows : rows.filter((r) => r.department === dept);
    const filtered = q
      ? scoped.filter(
          (r) =>
            r.fullName.toLowerCase().includes(q) ||
            (r.department ?? '').toLowerCase().includes(q) ||
            r.role.toLowerCase().includes(q) ||
            (r.teamLeaderName ?? '').toLowerCase().includes(q),
        )
      : scoped;

    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.fullName.localeCompare(b.fullName);
      if (sort === 'eps') return b.epCount - a.epCount;
      /*
        People with nothing assigned sink to the bottom rather than sitting
        at 0% among those who are genuinely behind — their zero is
        arithmetic, not conduct.
      */
      if (a.expected === 0 && b.expected !== 0) return 1;
      if (b.expected === 0 && a.expected !== 0) return -1;
      return b.rate - a.rate;
    });
  }, [rows, query, sort, dept]);

  /*
    Paged rather than scrolled. Seventy rows of six columns is a page that
    never ends and a scroll position nobody can refer to; a page number is
    something two people can say to each other.
  */
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // No setState here: `current` clamps for this render, and the search and
  // sort reset the page themselves. Writing state during render is how you
  // get a loop that only shows up on someone else's machine.

  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
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
              <Users size={15} className="text-muted-foreground" />
              Everyone
            </CardTitle>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative min-w-40 flex-1 sm:max-w-64">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, department, team…"
                aria-label="Search people"
                className="h-8 w-full rounded-lg border border-border bg-transparent pr-2 pl-8 text-xs outline-none placeholder:text-muted-foreground focus:border-ring"
              />
            </div>

            <Select
              value={dept}
              onValueChange={(v) => {
                if (!v) return;
                setDept(String(v));
                setPage(1);
              }}
            >
              <SelectTrigger
                className="h-8 w-36 shrink-0 rounded-lg border border-border bg-transparent text-xs"
                aria-label="Filter by department"
              >
                <SelectValue>
                  {(v) => (v === ALL_DEPTS ? 'All departments' : String(v))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value={ALL_DEPTS} label="All departments">
                  All departments
                </SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d} label={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => {
                setSort((s) => (s === 'rate' ? 'name' : s === 'name' ? 'eps' : 'rate'));
                setPage(1);
              }}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              <ArrowUpDown size={13} className="opacity-60" />
              {sort === 'rate' ? 'By rate' : sort === 'name' ? 'By name' : 'By EPs'}
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            {query ? `Nobody matches “${query}”.` : 'No people yet.'}
          </p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 pl-6 text-left font-semibold">Person</th>
                    <th className="px-3 py-2 text-left font-semibold">Role</th>
                    <th className="px-3 py-2 text-left font-semibold">Dept</th>
                    <th className="px-3 py-2 text-left font-semibold">Team</th>
                    <th className="px-3 py-2 text-right font-semibold">EPs</th>
                    {SCORED_FIELDS.map((f) => (
                      <th key={f.key} className="px-2 py-2 text-right font-semibold" title={f.label}>
                        {f.short}
                      </th>
                    ))}
                    <th className="py-2 pr-6 pl-3 text-right font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.userId} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-2.5 pr-3 pl-6 font-medium">{r.fullName}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {r.role === 'TEAM_LEADER' ? 'Team Leader' : 'Member'}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.department ? <DepartmentBadge department={r.department} /> : '—'}
                      </td>
                      <td className="max-w-32 truncate px-3 py-2.5 text-muted-foreground">
                        {r.teamLeaderName ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.epCount}</td>
                      {SCORED_FIELDS.map((f) => (
                        <td
                          key={f.key}
                          className="px-2 py-2.5 text-right tabular-nums text-muted-foreground"
                        >
                          {pct(r.byField[f.key] ?? { filled: 0, expected: 0 })}
                        </td>
                      ))}
                      <td
                        className={cn(
                          'py-2.5 pr-6 pl-3 text-right font-bold tabular-nums',
                          rateTone(r.rate, r.expected),
                        )}
                      >
                        {r.expected === 0 ? '—' : `${r.rate}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <ul className="divide-y md:hidden">
              {pageRows.map((r) => (
                <li key={r.userId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.fullName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{r.role === 'TEAM_LEADER' ? 'Team Leader' : 'Member'}</span>
                        {r.department && (
                          <>
                            <span>·</span>
                            <span>{r.department}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{r.epCount} EP{r.epCount === 1 ? '' : 's'}</span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-base font-bold tabular-nums',
                        rateTone(r.rate, r.expected),
                      )}
                    >
                      {r.expected === 0 ? '—' : `${r.rate}%`}
                    </span>
                  </div>

                  {r.expected > 0 && (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-aiesec-blue"
                          style={{ width: `${Math.min(r.rate, 100)}%` }}
                        />
                      </div>
                      <ul className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {SCORED_FIELDS.map((f) => (
                          <li key={f.key} className="flex items-center justify-between gap-1">
                            <span className="truncate">{f.short}</span>
                            <span className="shrink-0 tabular-nums">
                              {pct(r.byField[f.key] ?? { filled: 0, expected: 0 })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="border-t px-4 py-3 md:px-6">
                <PaginationBar
                  page={current}
                  totalPages={totalPages}
                  total={visible.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
