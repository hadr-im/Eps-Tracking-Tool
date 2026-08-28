import { Users, PhoneCall, CheckCircle, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary } from '@/types/dashboard';

interface Stat {
  label: string;
  value: number;
  icon: React.ElementType;
}

function buildStats(summary: DashboardSummary): Stat[] {
  return [
    { label: 'Assigned',  value: summary.totalAssigned,  icon: Users       },
    { label: 'Contacted', value: summary.totalContacted, icon: PhoneCall   },
    { label: 'Approved',  value: summary.totalApproved,  icon: CheckCircle },
    { label: 'Realised',  value: summary.totalRealised,  icon: Award       },
  ];
}

interface SummaryCardsProps {
  summary?: DashboardSummary;
  isLoading: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border">
            <CardContent className="p-5 flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = buildStats(summary);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border">
            <CardContent className="p-5 flex items-center gap-4">
              <Icon size={28} className="shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
