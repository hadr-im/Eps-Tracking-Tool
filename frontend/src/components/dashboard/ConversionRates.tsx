import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ConversionRates as ConversionRatesType } from '@/types/dashboard';

interface RateStat {
  label: string;
  description: string;
  rate: number;
  color: string; 
}

function buildRates(rates: ConversionRatesType): RateStat[] {
  return [
    {
      label: 'Contacted Rate',
      description: 'of assigned EPs were contacted',
      rate: rates.contactedRate,
      color: 'bg-blue-500',
    },
    {
      label: 'Interested Rate',
      description: 'of contacted became interested',
      rate: rates.interestedRate,
      color: 'bg-violet-500',
    },
    {
      label: 'Approval Rate',
      description: 'of interested got approved',
      rate: rates.approvalRate,
      color: 'bg-emerald-500',
    },
  ];
}

interface ConversionRatesProps {
  rates?: ConversionRatesType;
  isLoading: boolean;
}

export function ConversionRates({ rates, isLoading }: ConversionRatesProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-3 w-44" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const stats = buildRates(rates ?? { contactedRate: 0, interestedRate: 0, approvalRate: 0 });

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Conversion Rates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{stat.label}</span>
              <span className="font-bold tabular-nums text-foreground">
                {stat.rate.toFixed(1)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${stat.color}`}
                style={{ width: `${Math.min(stat.rate, 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">{stat.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
