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
} from 'lucide-react';

import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { TeamsPanel } from '@/components/admin/TeamsPanel';
import type { AdminPeriod, ExpaRange } from '@/types/admin';

const PERIODS: { value: AdminPeriod; label: string }[] = [
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<AdminPeriod>('month');
  // The EXPA chart has its own range: it answers a different question from
  // the completion period and the two should not drag each other about.
  const [expaRange, setExpaRange] = useState<ExpaRange>('day');

  const { data, isLoading, isFetching, isError } = useAdminDashboard(period, expaRange);

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

        <ChampionCard champions={data?.champions} isLoading={isLoading} />

        <CompletionScope
          lc={data?.rollups.lc}
          departments={data?.rollups.departments}
          people={data?.people}
          isLoading={isLoading}
        />

        {/*
          Ranking and teams side by side: both answer "who is behind", one
          per person and one per team, and reading them together is what
          turns a name into something a VP can act on.
        */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <CompletionRanking people={data?.people} isLoading={isLoading} />
          <TeamsPanel
            people={data?.people}
            departments={(data?.rollups.departments ?? []).map((d) => d.label)}
            isLoading={isLoading}
          />
        </div>

        <ExpaUsagePanel
          usage={data?.expa}
          range={expaRange}
          onRangeChange={setExpaRange}
          isLoading={isLoading}
        />

        <CompletionTable
          rows={data?.people}
          departments={(data?.rollups.departments ?? []).map((d) => d.label)}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
