// TransitionStats (shows product-to-product transition counts)
// Data comes from GET /dashboard/department (transitionStats field)

import { ArrowRight, Shuffle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TransitionStat } from '@/types/dashboard';

const PRODUCT_COLOR: Record<string, string> = {
  GV:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  GTA: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  GTE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

function ProductPill({ product }: { product: string }) {
  const cls = PRODUCT_COLOR[product] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {product}
    </span>
  );
}

interface TransitionStatsProps {
  data?: TransitionStat[];
  isLoading: boolean;
}

export function TransitionStats({ data, isLoading }: TransitionStatsProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEmpty = !data || data.length === 0;

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shuffle size={15} className="text-violet-500" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...(data ?? [])]
              .sort((a, b) => b.count - a.count)
              .map((stat) => (
                <div
                  key={`${stat.fromProduct}-${stat.toProduct}`}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border bg-muted/20 px-3 py-3"
                >
                  <div className="flex items-center gap-1.5">
                    <ProductPill product={stat.fromProduct} />
                    <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                    <ProductPill product={stat.toProduct} />
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{stat.count}</span>
                  <span className="text-[10px] text-muted-foreground">transitions</span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
