// TrendsChart (AreaChart showing approval/realisation counts per week/month)
// Data comes from StatusHistory via GET /dashboard/department (trends field)
// Groups raw StatusChangeTrend[] by date bucket, one series per tracked status

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StatusChangeTrend } from '@/types/dashboard';
import { STATUS_COLOR, TOOLTIP_STYLE } from './chartTokens';

const TRACKED_STATUSES = ['APPROVED', 'REALIZED', 'COMPLETED'] as const;

const STATUS_LABEL: Record<string, string> = {
  APPROVED:  'Approved',
  REALIZED:  'Realised',
  COMPLETED: 'Completed',
};

interface TrendPoint {
  label: string;
  [status: string]: number | string;
}

function buildChartData(trends: StatusChangeTrend[]): TrendPoint[] {
  // Group by date
  const byDate = new Map<string, TrendPoint>();

  for (const row of trends) {
    if (!TRACKED_STATUSES.includes(row.status as any)) continue;
    if (!byDate.has(row.date)) {
      byDate.set(row.date, {
        label: new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        ...Object.fromEntries(TRACKED_STATUSES.map((s) => [s, 0])),
      });
    }
    byDate.get(row.date)![row.status] = row.count;
  }

  return Array.from(byDate.values()).sort((a, b) =>
    (a.label as string).localeCompare(b.label as string),
  );
}

interface TrendsChartProps {
  data?: StatusChangeTrend[];
  isLoading: boolean;
}


export function TrendsChart({ data, isLoading }: TrendsChartProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const chartData = buildChartData(data ?? []);
  const isEmpty = chartData.length === 0;

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp size={15} className="text-emerald-500" />
          Approval Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
            <TrendingUp size={36} className="text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              No trend data yet. Stats will appear as EPs progress through the pipeline.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={264}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <defs>
                {TRACKED_STATUSES.map((status) => (
                  <linearGradient key={status} id={`grad-${status}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={STATUS_COLOR[status]} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={STATUS_COLOR[status]} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
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
                contentStyle={TOOLTIP_STYLE}
                cursor={{ stroke: 'var(--color-border)', strokeDasharray: '3 3' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => STATUS_LABEL[value] ?? value}
              />
              {TRACKED_STATUSES.map((status) => (
                <Area
                  key={status}
                  type="monotone"
                  dataKey={status}
                  name={status}
                  stroke={STATUS_COLOR[status]}
                  strokeWidth={2}
                  fill={`url(#grad-${status})`}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
