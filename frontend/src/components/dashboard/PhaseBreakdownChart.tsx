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
import { TOOLTIP_STYLE } from './chartTokens';

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

// Slice colours pulled from the shared chart palette. Same hues the funnel
// uses (cold -> warm -> green), no rose — red never carries meaning on this
// dashboard.
const COLORS = [
  'var(--chart-blue)',
  'var(--chart-violet)',
  'var(--chart-amber)',
  'var(--chart-teal)',
  'var(--chart-emerald)',
  'var(--gv)',
  'var(--gta)',
  'var(--gte)',
  'var(--color-muted-foreground)',
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
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="42%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8, color: 'var(--color-muted-foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
