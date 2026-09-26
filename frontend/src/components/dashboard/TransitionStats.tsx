// TransitionStats (bar chart of product-to-product transition counts)
// Data comes from GET /dashboard/department (transitionStats field)

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
import { Shuffle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransitionStat } from '@/types/dashboard';
import { PRODUCT_COLOR, TOOLTIP_STYLE, CHART_HOVER_FILL } from './chartTokens';

interface TransitionStatsProps {
  data?: TransitionStat[];
  isLoading: boolean;
}

interface BarPoint {
  label: string;
  from: string;
  to: string;
  count: number;
}

function toBarData(stats: TransitionStat[]): BarPoint[] {
  return [...stats]
    .sort((a, b) => b.count - a.count)
    .map((s) => ({
      label: `${s.fromProduct} → ${s.toProduct}`,
      from: s.fromProduct,
      to: s.toProduct,
      count: s.count,
    }));
}

export function TransitionStats({ data, isLoading }: TransitionStatsProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const bars = toBarData(data ?? []);
  const isEmpty = bars.length === 0;

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shuffle size={15} className="text-dispatcher" />
          Product Transitions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-24 text-center gap-2">
            <Shuffle size={28} className="text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No transitions recorded yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <BarChart
              data={bars}
              margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                // Soft brand-tinted highlight instead of Recharts' dark grey.
                cursor={{ fill: CHART_HOVER_FILL }}
                formatter={(value) => [value, 'Transitions']}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {/* Each bar takes the colour of the destination product, so at
                    a glance you see where EPs are going, not where they came
                    from. */}
                {bars.map((b) => (
                  <Cell key={b.label} fill={PRODUCT_COLOR[b.to] ?? 'var(--chart-blue)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
