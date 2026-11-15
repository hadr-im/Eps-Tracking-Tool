import { DateRangePresetFilter, windowForPreset } from '@/components/dashboard/DateRangePresetFilter';
import type { DatePreset } from '@/components/dashboard/DateRangePresetFilter';
// GlobalDashboardPage (VP only)
// Department-wide performance view:
//   - Summary KPI cards (totals across pipeline)
//   - Leaderboard BarChart (approved/realised per member) clicking opens member dashboard
//   - Approval Trends AreaChart (StatusHistory over time, configurable months)
//   - Product Transition stats
//   - Pipeline Funnel + Conversion Rates (reused from existing charts)
//   - Inline member dashboard slide-in when a leaderboard bar is clicked

import { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useDepartmentDashboard } from '@/hooks/useDepartmentDashboard';
import { SummaryCards }           from '@/components/dashboard/SummaryCards';
import { StatusFunnelChart }      from '@/components/dashboard/StatusFunnelChart';
import { ConversionRates }        from '@/components/dashboard/ConversionRates';
import { DimensionBreakdownChart } from '@/components/dashboard/DimensionBreakdownChart';
import { GraduationCap, BookOpen } from 'lucide-react';
import { PhaseBreakdownChart }    from '@/components/dashboard/PhaseBreakdownChart';
import { LeaderboardChart }       from '@/components/dashboard/LeaderboardChart';
import { TrendsChart }            from '@/components/dashboard/TrendsChart';
import { TransitionStats }        from '@/components/dashboard/TransitionStats';
import { PageHeader } from '@/components/layout/PageHeader';

export default function GlobalDashboardPage() {

  /*
    The period every figure on this page covers. 'all' sends no dates, so the
    default behaviour is unchanged from before the filter existed.
  */
  const [period, setPeriod] = useState<DatePreset>('all');
  const dateWindow = useMemo(() => windowForPreset(period), [period]);
  /*
    With a period chosen the figures count what happened in it, not
    where everyone stands, and the charts word themselves accordingly.
  */
  const isPeriod = period !== 'all';

  /*
    The trends chart reaches back a number of months. It used to have its own
    selector, which meant the page could show "this month" everywhere and a
    six-month trend line beside it. Derived from the period instead, so one
    choice governs the whole page.
  */
  const months = useMemo(() => {
    switch (period) {
      case 'today':
      case 'yesterday':
      case 'this_week':
      case 'this_month':
        return 1;
      case 'last_month':
        return 2;
      case 'last_3_months':
        return 3;
      default:
        return 6;
    }
  }, [period]);

  const { data, isLoading, isFetching, isError } = useDepartmentDashboard(months, dateWindow);

 


  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title="Global Overview"
        subtitle="Department-wide performance"
        actions={
          <DateRangePresetFilter
            value={period}
            onChange={setPeriod}
            isRefreshing={isFetching && !isLoading}
            className="h-9 w-44 rounded-lg border border-border bg-card text-xs font-medium"
          />
        }
      />


      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-6 space-y-6">

        {/* Error state */}
        {isError && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            <span>Failed to load dashboard data. Please refresh the page.</span>
          </div>
        )}

        {/* KPI summary cards */}
        <SummaryCards
          summary={data?.summary}
          transitions={(data?.transitionStats ?? []).reduce((sum, t) => sum + t.count, 0)}
          isLoading={isLoading}
        />

        {/* Leaderboard + Trends (side-by-side on large screens) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <LeaderboardChart
            data={data?.memberLeaderboard}
            isLoading={isLoading}
          />
          <TrendsChart
            data={data?.trends}
            isLoading={isLoading}
          />
        </div>

        {/* Pipeline funnel + conversion rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatusFunnelChart data={data?.statusFunnel} isLoading={isLoading} isPeriod={isPeriod} />
          <ConversionRates   rates={data?.conversionRates} isLoading={isLoading} isPeriod={isPeriod} />
        </div>

        {/*
          Phase breakdown beside the transitions.

          These two were in a three-child two-column grid along with the pair
          of breakdown charts, which left the phase card stretched to the
          height of two stacked pies beside it — the ring drawn at the top and
          two thirds of the card empty below it. Each row now holds only
          charts of its own height.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PhaseBreakdownChart data={data?.phaseBreakdown} isLoading={isLoading} />
          <TransitionStats     data={data?.transitionStats} isLoading={isLoading} />
        </div>

        {/*
          Where the leads come from. Side by side: they answer the same kind of
          question and are read together when deciding which campuses to target
          next. Full width wasted most of the row on empty card, and the reason
          they were split apart — a legend squeezed down to one character per
          name — is handled inside the chart now, which drops to a single
          legend column when its own card is narrow.
        */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <DimensionBreakdownChart
            title="Universities"
            icon={GraduationCap}
            data={data?.universityBreakdown}
            isLoading={isLoading}
            emptyMessage="No universities recorded yet."
          />
          <DimensionBreakdownChart
            title="Fields of Study"
            icon={BookOpen}
            data={data?.fieldOfStudyBreakdown}
            isLoading={isLoading}
            emptyMessage="No fields of study recorded yet."
          />
        </div>

      </div>
    </div>
  );
}
