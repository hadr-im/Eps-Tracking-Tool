/*
  The admin area — owner of the installation only.

  It answers one question in several sizes: is the CRM actually being filled
  in, and by whom. The LC total, then departments, then teams, then people —
  so a number that looks wrong can be followed down to the row that caused
  it without leaving the page.

  Completion counts the six fields a member owns, and counts the last three
  only once a conversation is live; the server's IAdminRepository explains
  why. The short version sits under the rollups, because a score nobody can
  interpret is a score people argue with.
*/

import { useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Info,
  Users2,
} from 'lucide-react';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChampionCard } from '@/components/admin/ChampionCard';
import { ExpaUsagePanel } from '@/components/admin/ExpaUsagePanel';
import { CompletionRanking } from '@/components/admin/CompletionRanking';
import { CompletionTable } from '@/components/admin/CompletionTable';
import { CompletionScope } from '@/components/admin/CompletionScope';
import { StatTile } from '@/components/admin/StatTile';
import { cn } from '@/lib/utils';
import type { AdminPeriod } from '@/types/admin';

const PERIODS: { value: AdminPeriod; label: string }[] = [
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<AdminPeriod>('month');
  const [showRule, setShowRule] = useState(false);

  const { data, isLoading, isFetching, isError } = useAdminDashboard(period, 24);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Admin"
        subtitle="Data completion across the LC, and EXPA usage"
        actions={
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <span className="text-[11px] text-muted-foreground">updating…</span>
            )}
            <Select value={period} onValueChange={(v) => v && setPeriod(v as AdminPeriod)}>
              <SelectTrigger
                className="h-9 w-40 rounded-lg border border-border bg-card text-xs font-medium"
                aria-label="Period the completion figures cover"
              >
                <SelectValue>
                  {(v) => PERIODS.find((p) => p.value === v)?.label ?? 'Last 30 days'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="text-xs">
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value} label={p.label}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex-1 space-y-6 overflow-auto px-4 py-6 md:px-6">
        {isError && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            <span>Failed to load the admin data. Please refresh the page.</span>
          </div>
        )}

        <ChampionCard champions={data?.champions} period={period} isLoading={isLoading} />

        <CompletionScope
          lc={data?.rollups.lc}
          departments={data?.rollups.departments}
          people={data?.people}
          isLoading={isLoading}
        />

        {/* What the score means — folded away, but one tap from the numbers */}
        <Card className="border">
          <button
            type="button"
            onClick={() => setShowRule((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left"
            aria-expanded={showRule}
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Info size={14} className="text-muted-foreground" />
              How completion is worked out
            </span>
            <ChevronDown
              size={16}
              className={cn('shrink-0 text-muted-foreground transition-transform', showRule && 'rotate-180')}
            />
          </button>
          {showRule && (
            <CardContent className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              <p>
                Three fields are expected on <strong>every</strong> EP assigned to someone:{' '}
                <strong>contacted</strong>, <strong>tracking phase</strong> and{' '}
                <strong>notes</strong>.
              </p>
              <p className="mt-2">
                Three more are expected <strong>only once the conversation is live</strong> —
                explaining AIESEC, looking for opportunities, interview, will sign, signed, or
                waiting for a CV: <strong>duration</strong>, <strong>availability</strong> and{' '}
                <strong>CV link</strong>. An EP who never replied is scored out of three, not six,
                so closing a dead lead honestly does not cost anyone marks.
              </p>
              <p className="mt-2">
                <strong>Interested</strong> is not scored — a blank is a fair "do not know yet".
                University, field of study, year and source are not scored either: the sign-up
                sheet fills those, so counting them would measure the sync rather than the member.
              </p>
              <p className="mt-2">
                EPs assigned in the last 24 hours are left out, so a fresh dispatch does not
                crater a score overnight.
              </p>
            </CardContent>
          )}
        </Card>

        <CompletionRanking people={data?.people} isLoading={isLoading} />

        {/* Teams */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users2 size={15} className="text-muted-foreground" />
              By team
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Grouped by team leader; people with no leader are not shown here
            </p>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-20 w-full rounded-lg" />
            ) : data.rollups.teams.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No teams set up yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.rollups.teams.map((t) => (
                  <StatTile key={t.label} row={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <ExpaUsagePanel usage={data?.expa} isLoading={isLoading} />

        <CompletionTable rows={data?.people} isLoading={isLoading} />
      </div>
    </div>
  );
}
