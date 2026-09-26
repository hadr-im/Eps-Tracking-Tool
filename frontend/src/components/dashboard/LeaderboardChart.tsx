import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { MemberBreakdown } from '@/types/dashboard';

interface LeaderboardChartProps {
  data?: MemberBreakdown[];
  isLoading: boolean;
  onMemberClick?: (memberId: string) => void;
}

import { TOOLTIP_STYLE, CHART_HOVER_FILL } from './chartTokens';

export function LeaderboardChart({ data, isLoading, onMemberClick }: LeaderboardChartProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = !data || data.length === 0;

  // Sort by approved desc, take top 15 for readability
  const chartData = [...(data ?? [])]
    .sort((a, b) => b.approvedCount - a.approvedCount)
    .slice(0, 15)
    .map((m) => ({
      name: m.fullName.split(' ')[0], // First name for axis brevity
      fullName: m.fullName,
      memberId: m.memberId,
      Approved: m.approvedCount,
      Realised: m.realisedCount,
    }));

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy size={15} className="text-amber-500" />
          Member Leaderboard
        </CardTitle>
        {onMemberClick && (
          <p className="text-[11px] text-muted-foreground">Click a bar to view member dashboard</p>
        )}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
            <Trophy size={36} className="text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No member data yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
              onClick={(payload: any) => {
                if (!onMemberClick || !payload?.activePayload?.[0]) return;
                const memberId = (payload.activePayload[0].payload as typeof chartData[0]).memberId;
                onMemberClick(memberId);
              }}
              style={{ cursor: onMemberClick ? 'pointer' : 'default' }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
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
                formatter={(value, name) => [value, name]}
                labelFormatter={(_, payload) =>
                  payload?.[0] ? (payload[0].payload as typeof chartData[0]).fullName : ''
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="Approved" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Realised" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
