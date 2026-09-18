import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge }    from '@/components/ui/badge';
import { DateCell } from '@/components/crm/cells/DateCell';
import { Plus, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransitionHistoryDto } from '@/types/ep';
import type { DepartmentMember } from '@/services/departmentService';
import { MemberPicker } from '@/components/team/MemberPicker';

const STATUS_COLORS: Record<string, string> = {
  LEAD:       'bg-sidebar-primary text-white border-sidebar-primary',
  CONTACTED:  'bg-blue-500   text-white border-blue-500',
  INTERESTED: 'bg-violet-500 text-white border-violet-500',
};

interface TransitionedEpsCardListProps {
  transitions: TransitionHistoryDto[];
  isLoading: boolean;
  departmentMembers: DepartmentMember[];
  onAssignEp?: (epId: string, memberId: string) => void;
  isAssigningId?: string | null;
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function TransitionMobileCard({
  transition,
  departmentMembers,
  onAssignEp,
  isAssigningId,
}: {
  transition: TransitionHistoryDto;
  departmentMembers: DepartmentMember[];
  onAssignEp?: (epId: string, memberId: string) => void;
  isAssigningId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const ep = transition.ep;
  const isInbound = transition.direction === 'INBOUND';

  return (
    <div className="rounded-2xl border border-border/70 bg-card overflow-hidden transition-all duration-200">
      {/* Header row */}
      <div 
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {ep ? getInitials(ep.fullName) : '?'}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{ep?.fullName ?? 'Unknown EP'}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span>{transition.fromProduct ?? '—'}</span>
            <ArrowRight size={10} />
            <span>{transition.toProduct ?? '—'}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 shrink-0",
              isInbound ? "bg-sidebar-primary text-white border-sidebar-primary" : "bg-sidebar-primary text-white border-sidebar-primary"
            )}
          >
            {isInbound ? "INBOUND" : "OUTBOUND"}
          </Badge>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <Minus size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/50 bg-card px-4 py-4 space-y-4">
            
            {onAssignEp && isInbound && ep && (
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">To Whom</span>
                <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <MemberPicker
                    members={departmentMembers}
                    selectedId={ep.ownerId ?? null}
                    onSelect={(id) => onAssignEp(ep.id, id)}
                    placeholder="Assign..."
                    disabled={isAssigningId === ep.id}
                    variant="outline"
                    className="h-8 w-36 text-xs rounded-full"
                  />
                </div>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-muted-foreground">
              {ep && (
                <>
                  <div>
                    <dt className="font-medium text-foreground/70 mb-0.5">EP ID</dt>
                    <dd className="font-mono truncate text-foreground">{ep.id}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground/70 mb-0.5">Status</dt>
                    <dd>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[ep.statusOnExpa] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {ep.statusOnExpa.charAt(0) + ep.statusOnExpa.slice(1).toLowerCase()}
                      </Badge>
                    </dd>
                  </div>
                  {ep.email && (
                    <div className="col-span-2">
                      <dt className="font-medium text-foreground/70 mb-0.5">Email</dt>
                      <dd className="truncate text-foreground">{ep.email}</dd>
                    </div>
                  )}
                  {ep.phone && (
                    <div>
                      <dt className="font-medium text-foreground/70 mb-0.5">Phone</dt>
                      <dd className="text-foreground">{ep.phone}</dd>
                    </div>
                  )}
                  {ep.university && (
                    <div className={ep.phone ? '' : 'col-span-2'}>
                      <dt className="font-medium text-foreground/70 mb-0.5">University</dt>
                      <dd className="truncate text-foreground">{ep.university}</dd>
                    </div>
                  )}
                </>
              )}
              
              <div>
                <dt className="font-medium text-foreground/70 mb-0.5">Triggered By</dt>
                <dd className="text-foreground">{transition.triggeredByName}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70 mb-0.5">Date</dt>
                <dd className="text-foreground"><DateCell value={transition.createdAt} /></dd>
              </div>
              
              {transition.note && (
                <div className="col-span-2">
                  <dt className="font-medium text-foreground/70 mb-0.5">Note</dt>
                  <dd className="text-foreground whitespace-pre-wrap">{transition.note}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransitionedEpsCardList({
  transitions,
  isLoading,
  departmentMembers,
  onAssignEp,
  isAssigningId,
}: TransitionedEpsCardListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
               <Skeleton className="h-9 w-9 rounded-full shrink-0" />
               <div className="space-y-1.5 flex-1">
                 <Skeleton className="h-4 w-32" />
                 <Skeleton className="h-3 w-20" />
               </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transitions.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No transitioned EPs found. Try adjusting your search.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transitions.map((t) => (
        <TransitionMobileCard 
          key={t.id}
          transition={t}
          departmentMembers={departmentMembers}
          onAssignEp={onAssignEp}
          isAssigningId={isAssigningId}
        />
      ))}
    </div>
  );
}
