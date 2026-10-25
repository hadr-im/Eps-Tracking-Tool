/*
  Page controls for the list tables.

  Shows a windowed range rather than every page number — at 30 pages a full
  row of buttons wraps and stops being scannable. First and last are always
  reachable, with ellipses standing in for the gap.
*/

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Shown alongside the range, e.g. the running selection count on Dispatch.
  note?: React.ReactNode;
  className?: string;
}

/*
  Page numbers to render, with null marking an elided run. Always first, last,
  and the current page with a neighbour either side.
*/
function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page]);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < totalPages) pages.add(page + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];

  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push(null);
    out.push(n);
  });

  return out;
}

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  note,
  className,
}: PaginationBarProps) {
  // Nothing to page through, but the count still orients the reader.
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-2.5 md:px-6',
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing <span className="font-medium text-foreground">{first}–{last}</span> of{' '}
            <span className="font-medium text-foreground">{total}</span>
          </>
        )}
        {note ? <span className="ml-2">{note}</span> : null}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </Button>

          {pageWindow(page, totalPages).map((n, i) =>
            n === null ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground select-none">
                …
              </span>
            ) : (
              <Button
                key={n}
                variant={n === page ? 'default' : 'outline'}
                size="sm"
                className="h-8 min-w-8 px-2 text-xs"
                onClick={() => onPageChange(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
              >
                {n}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
