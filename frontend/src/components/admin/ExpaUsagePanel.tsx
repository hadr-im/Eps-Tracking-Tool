/*
  How hard this tool is leaning on EXPA.

  EXPA is shared with every other committee and it rate-limits. Nothing used
  to record our own volume, so the first sign of trouble would have been a
  sync failing halfway through a run. The bar is the last rolling hour
  against the ceiling; the line behind it is what got us there.

  The ceiling is EXPA_HOURLY_LIMIT on the server, because it is a property of
  the account rather than of the page. Set it to whatever EXPA actually
  allows — the default is a guess, and a bar drawn against a guess is only
  useful for spotting a sudden change in shape.

  Two series, so there is a legend. One hue each and far apart: the whole
  point of the second line is that a run of failures should be impossible to
  mistake for ordinary traffic.
*/

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TOOLTIP_STYLE } from '@/components/dashboard/chartTokens';
import { cn } from '@/lib/utils';
import type { ExpaUsage, ExpaRange } from '@/types/admin';

const RANGES: { value: ExpaRange; label: string }[] = [
  { value: 'day', label: 'Last 24 hours' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

interface ExpaUsagePanelProps {
  usage?: ExpaUsage;
  range: ExpaRange;
  onRangeChange: (range: ExpaRange) => void;
  isLoading: boolean;
}

/*
  Status colours, not series colours: this says whether something is fine,
  getting close, or about to break. They ship with the figure and a label
  beside them, never as colour alone.
*/
function barTone(pct: number): { bar: string; text: string; word: string } {
  if (pct >= 85) return { bar: 'bg-rose-600', text: 'text-rose-600', word: 'close to the limit' };
  if (pct >= 60) return { bar: 'bg-amber-500', text: 'text-amber-600', word: 'over halfway' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-600', word: 'comfortable' };
}

export function ExpaUsagePanel({
  usage,
  range,
  onRangeChange,
  isLoading,
}: ExpaUsagePanelProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const u = usage ?? {
    lastHour: 0,
    lastHourFailed: 0,
    hourlyLimit: 1000,
    peakHour: 0,
    series: [],
    bucket: 'hour' as const,
    total: 0,
    byOperation: [],
  };

  const pct = u.hourlyLimit > 0 ? Math.min((u.lastHour / u.hourlyLimit) * 100, 100) : 0;
  const tone = barTone(pct);

  const points = u.series.map((p) => ({
    ...p,
    /*
      An hour bucket is a clock time; a day bucket is a date. Printing a
      time against a daily total would claim a precision the point does not
      have.
    */
    label:
      u.bucket === 'hour'
        ? new Date(p.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : new Date(p.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
  }));

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity size={15} className="text-muted-foreground" />
              EXPA requests
            </CardTitle>
          </div>

          {/*
            Only the line moves with this. The bar below stays hourly
            whatever is chosen, because the limit it is drawn against is an
            hourly limit — a month's total against a per-hour ceiling would
            read as catastrophically over.
          */}
          <Select value={range} onValueChange={(v) => v && onRangeChange(v as ExpaRange)}>
            <SelectTrigger
              className="h-9 w-36 rounded-lg border border-border bg-card text-xs font-medium"
              aria-label="How far back the request chart reaches"
            >
              <SelectValue>
                {(v) => RANGES.find((r) => r.value === v)?.label ?? 'Last 24 hours'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="text-xs">
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value} label={r.label}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* The bar */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-bold tabular-nums">
              {u.lastHour.toLocaleString()}
              <span className="font-medium text-muted-foreground">
                {' '}/ {u.hourlyLimit.toLocaleString()} per hour
              </span>
            </span>
            <span className={cn('text-[11px] font-semibold', tone.text)}>
              {Math.round(pct)}% — {tone.word}
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all duration-500', tone.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Busiest hour in this range: {u.peakHour.toLocaleString()}</span>
            {u.lastHourFailed > 0 && (
              <span className="flex items-center gap-1 font-medium text-rose-600">
                <AlertTriangle size={11} />
                {u.lastHourFailed} failed in the last hour
              </span>
            )}
          </div>
        </div>

        {/* The trend */}
        {points.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center gap-2 text-center">
            <Activity size={30} className="text-muted-foreground/30" strokeWidth={1.5} />
            <p className="max-w-xs text-sm text-muted-foreground">
              No calls recorded yet. This fills as the syncs run.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={points} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="expa-req" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-blue)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--chart-blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ stroke: 'var(--color-border)', strokeDasharray: '3 3' }}
                formatter={(value, name) => [value, name === 'requests' ? 'Requests' : 'Failed']}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                iconType="circle"
                iconSize={8}
                formatter={(v) => (v === 'requests' ? 'Requests' : 'Failed')}
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="var(--chart-blue)"
                strokeWidth={2}
                fill="url(#expa-req)"
                dot={false}
                activeDot={{ r: 4 }}
              />
              {/*
                A line, not a second filled area: failures are rare and small,
                and a fill that size disappears under the one above it.
              */}
              <Line
                type="monotone"
                dataKey="failed"
                stroke="#BE123C"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Which query is spending the quota */}
        {u.byOperation.length > 0 && (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-2">
            {u.byOperation.map((o) => (
              <li key={o.operation} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">{o.operation}</span>
                <span className="shrink-0 font-medium tabular-nums">
                  {o.requests.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
