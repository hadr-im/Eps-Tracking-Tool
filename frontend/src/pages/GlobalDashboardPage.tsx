// GlobalDashboardPage (VP only)
// Department-wide performance view:
//   - Summary KPI cards (totals across pipeline)
//   - Leaderboard BarChart (approved/realised per member) clicking opens member dashboard
//   - Approval Trends AreaChart (StatusHistory over time, configurable months)
//   - Product Transition stats
//   - Pipeline Funnel + Conversion Rates (reused from existing charts)
//   - Inline member dashboard slide-in when a leaderboard bar is clicked

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useDepartmentDashboard } from '@/hooks/useDepartmentDashboard';
import { SummaryCards }           from '@/components/dashboard/SummaryCards';
import { StatusFunnelChart }      from '@/components/dashboard/StatusFunnelChart';
import { ConversionRates }        from '@/components/dashboard/ConversionRates';
import { PhaseBreakdownChart }    from '@/components/dashboard/PhaseBreakdownChart';
import { LeaderboardChart }       from '@/components/dashboard/LeaderboardChart';
import { TrendsChart }            from '@/components/dashboard/TrendsChart';
import { TransitionStats }        from '@/components/dashboard/TransitionStats';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MONTH_OPTIONS = [
  { value: '3',  label: 'Last 3 months'  },
  { value: '6',  label: 'Last 6 months'  },
  { value: '12', label: 'Last 12 months' },
];

export default function GlobalDashboardPage() {
  const [months, setMonths]               = useState(6);

  const { data, isLoading, isError } = useDepartmentDashboard(months);

 


  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title="Global Overview"
        subtitle="Department-wide performance"
        actions={
          <Select
            value={String(months)}
            onValueChange={(v) => !v || setMonths(Number(v))}
          >
            <SelectTrigger
              className="h-9 w-44 rounded-lg border border-border bg-card text-xs font-medium"
              aria-label="Select time range"
            >
              {/* Render prop: without it the trigger shows the raw value ("6")
                  instead of the option's label. */}
              <SelectValue>
                {(val) =>
                  MONTH_OPTIONS.find((o) => o.value === val)?.label ?? 'Select range'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} label={o.label}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <StatusFunnelChart data={data?.statusFunnel} isLoading={isLoading} />
          <ConversionRates   rates={data?.conversionRates} isLoading={isLoading} />
        </div>

        {/* Phase breakdown + Product transitions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PhaseBreakdownChart data={data?.phaseBreakdown} isLoading={isLoading} />
          <TransitionStats     data={data?.transitionStats} isLoading={isLoading} />
        </div>

      </div>
    </div>
  );
}
