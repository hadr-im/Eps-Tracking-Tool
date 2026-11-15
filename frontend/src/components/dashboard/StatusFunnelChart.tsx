// StatusFunnelChart — Horizontal bar chart showing EP count per pipeline stage.
// Ordered Lead → Finished. Uses Recharts BarChart with custom colors per status.
// Responsive via ResponsiveContainer. Shows empty state if no data.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StatusCount } from '@/types/dashboard';
import { TOOLTIP_STYLE, CHART_HOVER_FILL, STATUS_COLOR } from './chartTokens';

// Ordered pipeline stages with display labels and colors
/*
  Stage colours come from the shared STATUS_COLOR map, so bars in the funnel
  match the pills in the tables and the areas in the trends chart. Completed
  and Realised sit next to each other in the funnel — they used two shades of
  green, which were hard to tell apart; the shared map splits them into
  emerald and teal.
*/

/*
  The stages are cumulative — "Contacted" is everyone who was contacted,
  including those since approved, not the ones who stopped there. The API
  sends them that way, so each bar is at most as tall as the one before it.

  They used to be a tally of each EXPA status instead, which read as a funnel
  but was not one, and which drew Contacted and Interested as empty forever
  because the sync never writes those two values. Both now come from the CRM
  columns the members actually fill in.
*/
const STAGE_META: Record<string, { label: string; color: string }> = {
  LEAD:        { label: 'All leads',  color: STATUS_COLOR.LEAD! },
  CONTACTED:   { label: 'Contacted',  color: STATUS_COLOR.CONTACTED! },
  INTERESTED:  { label: 'Interested', color: STATUS_COLOR.INTERESTED! },
  APPROVED:    { label: 'Approved',   color: STATUS_COLOR.APPROVED! },
  REALIZED:    { label: 'Realised',   color: STATUS_COLOR.REALIZED! },
  COMPLETED:   { label: 'Completed',  color: STATUS_COLOR.COMPLETED! },
  FINISHED:    { label: 'Finished',   color: STATUS_COLOR.FINISHED! },
};

const STAGE_ORDER = ['LEAD', 'CONTACTED', 'INTERESTED', 'APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED'];

interface StatusFunnelChartProps {
  data?: StatusCount[];
  isLoading: boolean;
  /*
    Whether the page is narrowed to a period. The bars then count what
    happened in it rather than where everyone stands, which means they no
    longer nest — an EP approved yesterday was contacted weeks ago — so the
    chart has to stop calling itself a funnel and stop quoting shares.
  */
  isPeriod?: boolean;
}

export function StatusFunnelChart({ data, isLoading, isPeriod = false }: StatusFunnelChartProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-55 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Sort by pipeline order and fill in zero for missing stages
  const chartData = STAGE_ORDER.map((status) => {
    const found = data?.find((d) => d.status === status);
    return {
      status,
      // The first bar is every lead in scope over all time, but inside a
      // period it is the ones handed out in it.
      label:
        status === 'LEAD' && isPeriod
          ? 'Assigned'
          : STAGE_META[status]?.label ?? status,
      count: found?.count ?? 0,
      color: STAGE_META[status]?.color ?? '#94a3b8',
    };
  });

  const isEmpty = chartData.every((d) => d.count === 0);

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          {isPeriod ? 'Activity in this period' : 'Pipeline Funnel'}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          {isPeriod
            ? 'What happened in this period — counts of events, so they need not fall'
            : 'How far the leads got — each stage includes everyone past it'}
        </p>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState message="No EPs assigned yet. Your funnel will appear here once you have leads." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: CHART_HOVER_FILL }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, _name, item) => {
                  const n = Number(value ?? 0);
                  // In period mode the bars are separate events, so a share
                  // of the first one would not mean anything.
                  if (isPeriod) return [`${n}`, 'EPs'];
                  const total = chartData[0]?.count ?? 0;
                  const share = total > 0 ? Math.round((n / total) * 100) : 0;
                  const stage = (item?.payload as { status?: string } | undefined)?.status;
                  // The first bar is the whole set; a share of itself says nothing.
                  return [stage === 'LEAD' ? `${n}` : `${n} (${share}% of all leads)`, 'EPs'];
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-55 text-center gap-3">
      <BarChart3 size={36} className="text-muted-foreground/40" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground max-w-60">{message}</p>
    </div>
  );
}
