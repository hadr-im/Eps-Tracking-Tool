import { AlertCircle } from 'lucide-react';
import { useMyDashboard }       from '@/hooks/useMyDashboard';
import { SummaryCards }         from '@/components/dashboard/SummaryCards';
import { StatusFunnelChart }    from '@/components/dashboard/StatusFunnelChart';
import { PhaseBreakdownChart }  from '@/components/dashboard/PhaseBreakdownChart';
import { ConversionRates }      from '@/components/dashboard/ConversionRates';

interface MyDashboardPageProps {
  // If provided, shows a specific member's stats (TL/VP use-case)
  userId?: string;
}

export default function MyDashboardPage({ userId }: MyDashboardPageProps = {}) {
  const { data, isLoading, isError } = useMyDashboard({ memberId: userId });

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="shrink-0 pl-4 pr-16 md:px-6 pt-4 md:pt-5 pb-3 bg-card border-b">
          <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {userId ? 'Team' : 'My'} Dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {userId ? 'Member Dashboard' : 'My Personal Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {userId
              ? "Viewing this member's EP performance stats"
              : 'Your personal EP pipeline performance'}
          </p>
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

        {/* Summary KPI cards */}
        <SummaryCards summary={data?.summary} isLoading={isLoading} />

        {/* Funnel + Conversion rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatusFunnelChart data={data?.statusFunnel} isLoading={isLoading} />
          <ConversionRates   rates={data?.conversionRates} isLoading={isLoading} />
        </div>

        {/* Phase breakdown */}
        <PhaseBreakdownChart data={data?.phaseBreakdown} isLoading={isLoading} />

      </div>
    </div>
  );
}
