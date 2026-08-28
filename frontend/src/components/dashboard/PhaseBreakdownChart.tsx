import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PhaseCount } from '@/types/dashboard';

// Human-readable phase labels — mirrors TrackingPhaseCell
const PHASE_LABELS: Record<string, string> = {
  WAITING_FOR_ANSWER:        'Waiting for Answer',
  EP_NOT_RESPONDING:         'Not Responding',
  EXPLAINING_AIESEC:         'Explaining AIESEC',
  LOOKING_FOR_OPPORTUNITIES: 'Looking for Opportunities',
  HAVING_INTERVIEW:          'Having Interview',
  WILL_SIGN_CONTRACT:        'Will Sign Contract',
  CONTRACT_SIGNED:           'Contract Signed',
  WAITING_FOR_CV:            'Waiting for CV',
  NOT_INTERESTED_ANYMORE:    'Not Interested',
};

// color palette for slices
const COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981',
  '#ef4444', '#6366f1', '#f97316', '#14b8a6', '#ec4899',
];

interface PhaseBreakdownChartProps {
  data?: PhaseCount[];
  isLoading: boolean;
}

export function PhaseBreakdownChart({ data, isLoading }: PhaseBreakdownChartProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-65 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (data ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: PHASE_LABELS[d.phase] ?? d.phase,
      value: d.count,
    }));

  const isEmpty = chartData.length === 0;

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tracking Phase Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-65 text-center gap-3">
            <PieChartIcon size={36} className="text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground max-w-60">
              No tracking phases set yet. Start updating your EPs to see this chart.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(value, name) => [value, name]}
            />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
