import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TOOLTIP_STYLE, CHART_HOVER_FILL, CHART_COLORS } from './chartTokens';

/*
  Which measure the leaderboard ranks on.

  Approved and realised answer "who is converting"; contacted answers "who is
  actually working their list", which is the question earlier in a campaign
  when nobody has an approval yet — and with no approvals the chart was simply
  empty, which read as broken.
*/
const MEASURES = [
  { value: 'contactedCount', label: 'Contacted', color: CHART_COLORS.blue },
  { value: 'approvedCount', label: 'Approved', color: CHART_COLORS.amber },
  { value: 'realisedCount', label: 'Realised', color: CHART_COLORS.emerald },
] as const;

type MeasureKey = (typeof MEASURES)[number]['value'];

export function LeaderboardChart({ data, isLoading, onMemberClick }: LeaderboardChartProps) {
  const [measure, setMeasure] = useState<MeasureKey>('approvedCount');
  const active = MEASURES.find((m) => m.value === measure)!;
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

  // Ranked on whichever measure is selected, top 15 for readability.
  const chartData = [...(data ?? [])]
    .sort((a, b) => b[measure] - a[measure])
    .slice(0, 15)
    .map((m) => ({
      name: m.fullName.split(' ')[0], // First name for axis brevity
      fullName: m.fullName,
      memberId: m.memberId,
      value: m[measure],
    }));

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy size={15} className="text-amber-500" />
              Member Leaderboard
            </CardTitle>
            {onMemberClick && (
              <p className="text-[11px] text-muted-foreground">
                Click a bar to view member dashboard
              </p>
            )}
          </div>

          {/* Ranked by — top right, where the reader looks after the title. */}
          <Select value={measure} onValueChange={(v) => v && setMeasure(v as MeasureKey)}>
            <SelectTrigger
              className="h-8 w-32 shrink-0 text-xs"
              aria-label="Rank the leaderboard by"
            >
              <SelectValue>
                {(v) => MEASURES.find((m) => m.value === v)?.label ?? 'Approved'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="text-xs">
              {MEASURES.map((m) => (
                <SelectItem key={m.value} value={m.value} label={m.label}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                formatter={(value) => [value, active.label]}
                labelFormatter={(_, payload) =>
                  payload?.[0] ? (payload[0].payload as typeof chartData[0]).fullName : ''
                }
              />
              {/*
                A single series, so no legend: the dropdown above already
                names what the bars are, and a one-entry legend repeating it
                is noise.
              */}
              <Bar
                dataKey="value"
                name={active.label}
                fill={active.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
