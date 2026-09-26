import { Users, PhoneCall, CheckCircle, Award, Shuffle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary } from '@/types/dashboard';

interface Stat {
  label: string;
  value: number;
  icon: React.ElementType;
  tint: string;
}

function buildStats(
  summary: DashboardSummary,
  transitions: number | undefined,
): Stat[] {
  /*
    Icon tints match the status palette in chartTokens.ts, so an "Approved"
    tile is the same amber as the Approved stage in the funnel, and every
    metric on the dashboard reads from one colour system.
  */
  const stats: Stat[] = [
    { label: 'Assigned',  value: summary.totalAssigned,  icon: Users,       tint: 'text-muted-foreground bg-muted' },
    { label: 'Contacted', value: summary.totalContacted, icon: PhoneCall,   tint: 'text-chart-blue bg-chart-blue/10' },
    { label: 'Approved',  value: summary.totalApproved,  icon: CheckCircle, tint: 'text-chart-amber bg-chart-amber/10' },
    { label: 'Realised',  value: summary.totalRealised,  icon: Award,       tint: 'text-chart-teal bg-chart-teal/10' },
  ];

  // Optional — only the VP dashboard has this figure.
  if (typeof transitions === 'number') {
    stats.push({
      label: 'Transitions',
      value: transitions,
      icon: Shuffle,
      tint: 'text-dispatcher bg-dispatcher/10',
    });
  }

  return stats;
}

interface SummaryCardsProps {
  summary?: DashboardSummary;
  transitions?: number;
  isLoading: boolean;
}

export function SummaryCards({ summary, transitions, isLoading }: SummaryCardsProps) {
  /*
    On phones each KPI takes the full row, so nothing is truncated and every
    number is easy to read at arm's length. Two columns from small tablets,
    then a wider spread on desktop that grows to 5 when the VP dashboard
    passes the transitions figure.
  */
  const cols =
    'grid-cols-1 sm:grid-cols-2 ' +
    (typeof transitions === 'number' ? 'lg:grid-cols-5' : 'lg:grid-cols-4');
  const skeletonCount = typeof transitions === 'number' ? 5 : 4;

  if (isLoading || !summary) {
    return (
      <div className={`grid ${cols} gap-4`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card key={i} className="border">
            <CardContent className="p-5 flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = buildStats(summary, transitions);

  return (
    <div className={`grid ${cols} gap-4`}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border">
            <CardContent className="p-5 flex items-center gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.tint}`}>
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-3xl font-bold tabular-nums">{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
