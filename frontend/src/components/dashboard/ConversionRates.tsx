import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ConversionRates as ConversionRatesType } from '@/types/dashboard';

interface RateStat {
  label: string;
  description: string;
  rate: number;
  color: string; 
}

/*
  Bar colours match the funnel: contacted -> blue, interested -> violet,
  approved -> amber. Pulling from the shared chart tokens means these bars
  and the funnel stages next to them agree on what each stage looks like.
*/
/*
  The wording changes with the period, because the figure does.

  Over all time these follow one group of people down the pipeline: of the
  EPs assigned, this share was contacted. Inside a period they compare things
  that happened in it, and the EP approved on Tuesday is rarely the one
  contacted on Tuesday — so they are described as comparisons, and they can
  pass 100% when the work spans periods. Saying "of contacted became
  interested" there would be a claim about individual people that the number
  does not support.
*/
function buildRates(rates: ConversionRatesType, isPeriod: boolean): RateStat[] {
  return [
    {
      label: 'Contacted Rate',
      description: isPeriod
        ? 'contacted, against EPs assigned in this period'
        : 'of assigned EPs were contacted',
      rate: rates.contactedRate,
      color: 'bg-chart-blue',
    },
    {
      label: 'Interested Rate',
      description: isPeriod
        ? 'marked interested, against those contacted'
        : 'of contacted became interested',
      rate: rates.interestedRate,
      color: 'bg-chart-violet',
    },
    {
      label: 'Approval Rate',
      description: isPeriod
        ? 'approvals, against those marked interested'
        : 'of interested got approved',
      rate: rates.approvalRate,
      color: 'bg-chart-amber',
    },
  ];
}

interface ConversionRatesProps {
  rates?: ConversionRatesType;
  isLoading: boolean;
  // True when the reader has narrowed the page to a period.
  isPeriod?: boolean;
}

export function ConversionRates({ rates, isLoading, isPeriod = false }: ConversionRatesProps) {
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

  const stats = buildRates(
    rates ?? { contactedRate: 0, interestedRate: 0, approvalRate: 0 },
    isPeriod,
  );

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Conversion Rates</CardTitle>
        {isPeriod && (
          <p className="text-[11px] text-muted-foreground">
            Comparing what happened in this period, so these can pass 100%
          </p>
        )}
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
