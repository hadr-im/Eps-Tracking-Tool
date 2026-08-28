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

// Ordered pipeline stages with display labels and colors
const STAGE_META: Record<string, { label: string; color: string }> = {
  LEAD:        { label: 'Lead',       color: '#64748b' }, // slate-500
  CONTACTED:   { label: 'Contacted',  color: '#3b82f6' }, // blue-500
  INTERESTED:  { label: 'Interested', color: '#8b5cf6' }, // violet-500
  APPROVED:    { label: 'Approved',   color: '#f59e0b' }, // amber-500
  REALIZED:    { label: 'Realised',   color: '#10b981' }, // emerald-500
  COMPLETED:   { label: 'Completed',  color: '#22c55e' }, // green-500
  FINISHED:    { label: 'Finished',   color: '#9ca3af' }, // gray-400
};

const STAGE_ORDER = ['LEAD', 'CONTACTED', 'INTERESTED', 'APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED'];

interface StatusFunnelChartProps {
  data?: StatusCount[];
  isLoading: boolean;
}

export function StatusFunnelChart({ data, isLoading }: StatusFunnelChartProps) {
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
      label: STAGE_META[status]?.label ?? status,
      count: found?.count ?? 0,
      color: STAGE_META[status]?.color ?? '#94a3b8',
    };
  });

  const isEmpty = chartData.every((d) => d.count === 0);

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Pipeline Funnel</CardTitle>
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
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value) => [value, 'EPs']}
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
