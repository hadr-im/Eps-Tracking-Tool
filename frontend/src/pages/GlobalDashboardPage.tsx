// GlobalDashboardPage (VP only)
// Department-wide performance view:
//   - Summary KPI cards (totals across pipeline)
//   - Leaderboard BarChart (approved/realised per member) clicking opens member dashboard
//   - Approval Trends AreaChart (StatusHistory over time, configurable months)
//   - Product Transition stats
//   - Pipeline Funnel + Conversion Rates (reused from existing charts)
//   - Inline member dashboard slide-in when a leaderboard bar is clicked

import { useState } from 'react';
import { LayoutDashboard, UserCircle2, X, AlertCircle } from 'lucide-react';
import { useNavigate }            from 'react-router-dom';
import { useDepartmentDashboard } from '@/hooks/useDepartmentDashboard';
import { SummaryCards }           from '@/components/dashboard/SummaryCards';
import { StatusFunnelChart }      from '@/components/dashboard/StatusFunnelChart';
import { ConversionRates }        from '@/components/dashboard/ConversionRates';
import { PhaseBreakdownChart }    from '@/components/dashboard/PhaseBreakdownChart';
import { LeaderboardChart }       from '@/components/dashboard/LeaderboardChart';
import { TrendsChart }            from '@/components/dashboard/TrendsChart';
import { TransitionStats }        from '@/components/dashboard/TransitionStats';
import { Button }                 from '@/components/ui/button';
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
  const navigate = useNavigate();
  const [months, setMonths]               = useState(6);
  const [focusMemberId, setFocusMemberId] = useState<string | null>(null);

  const { data, isLoading, isError } = useDepartmentDashboard(months);

  // Resolve focused member's name from leaderboard data
  const focusedMember = focusMemberId
    ? data?.memberLeaderboard.find((m) => m.memberId === focusMemberId)
    : null;

  function handleMemberClick(memberId: string) {
    setFocusMemberId((prev) => (prev === memberId ? null : memberId));
  }

  function handleViewFullDashboard() {
    if (!focusMemberId) return;
    navigate(`/team/dashboard?memberId=${focusMemberId}`);
  }

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="shrink-0 px-4 md:px-6 pt-5 pb-3 border-b bg-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <LayoutDashboard size={20} className="text-[var(--sidebar-primary)]" />
              Global Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Department-wide performance
            </p>
          </div>

          {/* Time-range selector */}
          <Select
            value={String(months)}
            onValueChange={(v) => !v || setMonths(Number(v))}
          >
            <SelectTrigger className="h-8 w-40 text-xs" aria-label="Select time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
        <SummaryCards summary={data?.summary} isLoading={isLoading} />

        {/* Leaderboard + Trends (side-by-side on large screens) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <LeaderboardChart
            data={data?.memberLeaderboard}
            isLoading={isLoading}
            onMemberClick={handleMemberClick}
          />
          <TrendsChart
            data={data?.trends}
            isLoading={isLoading}
          />
        </div>

        {/* Focused member banner */}
        {focusedMember && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
            <UserCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="flex-1 text-sm font-medium text-blue-700 dark:text-blue-300">
              Viewing stats for <span className="font-bold">{focusedMember.fullName}</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900"
              onClick={handleViewFullDashboard}
            >
              Open Full Dashboard
            </Button>
            <button
              type="button"
              onClick={() => setFocusMemberId(null)}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors"
              aria-label="Close member view"
            >
              <X size={15} />
            </button>
          </div>
        )}

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
