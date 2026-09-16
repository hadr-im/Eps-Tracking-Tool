import { useTransitions } from '@/hooks/useTransitions';
import { DateCell } from '@/components/crm/cells/DateCell';
import { ArrowRight, LogIn, LogOut } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function TransitionedEpsPage() {
  const { data: transitions = [], isLoading } = useTransitions();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 bg-card border-b">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Oversight
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Transitioned EPs</h1>
        <p className="text-sm text-muted-foreground">
          View EPs transitioned in or out of your department
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-6 py-6 overflow-auto">
        <div className="relative w-full h-full overflow-auto rounded-xl border bg-card">
          <Table className="w-max min-w-full table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="border-b-0">
                <TableHead colSpan={3} className="border-x text-center text-xs font-semibold tracking-wide py-1.5 bg-blue-500 text-white border-blue-500">
                  General Info
                </TableHead>
                <TableHead colSpan={4} className="border-r text-center text-xs font-semibold tracking-wide py-1.5 bg-violet-500 text-white border-violet-500">
                  Transition Details
                </TableHead>
              </TableRow>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[100px] whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 bg-muted/40">EP ID</TableHead>
                <TableHead className="w-[200px] whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 bg-muted/40">Full Name</TableHead>
                <TableHead className="w-auto whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 bg-muted/40">University</TableHead>
                <TableHead className="w-[150px] whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 bg-muted/40">Date</TableHead>
                <TableHead className="w-[160px] whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 bg-muted/40">Transition</TableHead>
                <TableHead className="w-[160px] whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 bg-muted/40">Triggered By</TableHead>
                <TableHead className="min-w-[250px] whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 bg-muted/40">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j} className="border-r last:border-r-0 py-2">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-muted-foreground text-sm">
                    No transitioned EPs found.
                  </TableCell>
                </TableRow>
              ) : (
                transitions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell className="border-r last:border-r-0 py-2 text-center align-middle">
                      <span className="font-mono text-xs text-muted-foreground">{t.epId}</span>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0 py-2 text-center align-middle">
                      <span className="font-medium text-sm whitespace-nowrap">{t.epName}</span>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0 py-2 text-center align-middle">
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        {t.epUniversity ? (
                          <>
                            <span className="text-xs">{t.epUniversity}</span>
                            {t.epFieldOfStudy && (
                              <span className="text-[11px] text-muted-foreground">{t.epFieldOfStudy}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0 py-2 text-center align-middle">
                      <div className="flex items-center justify-center w-full h-full">
                        <DateCell value={t.createdAt} withTime />
                      </div>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0 py-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-2 text-sm font-medium w-full h-full">
                        <span className="text-muted-foreground">{t.fromProduct ?? '—'}</span>
                        <ArrowRight size={14} className="text-muted-foreground" />
                        <span className="text-foreground">{t.toProduct ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="border-r last:border-r-0 py-2 text-center align-middle text-sm text-muted-foreground">
                      {t.triggeredByName}
                    </TableCell>
                    <TableCell className="border-r last:border-r-0 py-2 text-center align-middle">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                        {t.note || '—'}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
