import { Skeleton } from '@/components/ui/skeleton';
import { Badge }    from '@/components/ui/badge';
import { DateCell } from '@/components/crm/cells/DateCell';
import {
  ArrowRight,
  Mail,
  Phone,
  GraduationCap,
  User,
  Calendar,
  StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransitionHistoryDto, EpStatus } from '@/types/ep';
import type { DepartmentMember } from '@/services/departmentService';
import { MemberPicker } from '@/components/team/MemberPicker';
import { StatusBadgeCell } from '@/components/crm/cells/StatusBadgeCell';
import {
  EpMobileCard,
  EpSection,
  EpInfoRow,
  EpBlockRow,
} from '@/components/crm/EpMobileCard';

interface TransitionedEpsCardListProps {
  transitions: TransitionHistoryDto[];
  isLoading: boolean;
  departmentMembers: DepartmentMember[];
  onAssignEp?: (epId: string, memberId: string) => void;
  isAssigningId?: string | null;
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
  const ep = transition.ep;
  const isInbound = transition.direction === 'INBOUND';

  return (
    <EpMobileCard
      fullName={ep?.fullName ?? 'Unknown EP'}
      id={ep?.id ?? '—'}
      createdAt={transition.createdAt}
      headerSub={
        <span className="inline-flex items-center gap-1">
          {transition.fromProduct ?? '—'}
          <ArrowRight size={10} />
          {transition.toProduct ?? '—'}
        </span>
      }
      headerRight={
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-1.5 py-0 shrink-0',
            isInbound
              ? 'bg-aiesec-blue text-white border-aiesec-blue'
              : 'bg-muted text-foreground border-border',
          )}
        >
          {isInbound ? 'INBOUND' : 'OUTBOUND'}
        </Badge>
      }
      footer={
        onAssignEp && isInbound && ep ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Assign to</span>
            <div className="flex-1" onClick={(e) => e.stopPropagation()}>
              <MemberPicker
                members={departmentMembers}
                selectedId={ep.ownerId ?? null}
                onSelect={(id) => onAssignEp(ep.id, id)}
                placeholder="Assign..."
                disabled={isAssigningId === ep.id}
                variant="outline"
                className="h-8 w-full text-xs rounded-full"
              />
            </div>
          </div>
        ) : null
      }
    >
      {ep && (
        <EpSection label="EP Info" icon={User}>
          <EpInfoRow label="Status" value={<StatusBadgeCell status={ep.statusOnExpa as EpStatus} />} />
          <EpInfoRow label="Email" icon={Mail} value={ep.email} />
          <EpInfoRow label="Phone" icon={Phone} value={ep.phone} />
          <EpInfoRow label="University" icon={GraduationCap} value={ep.university} />
        </EpSection>
      )}

      <EpSection label="Transition" icon={ArrowRight}>
        <EpInfoRow label="Triggered By" icon={User} value={transition.triggeredByName} />
        <EpInfoRow label="Date" icon={Calendar} value={<DateCell value={transition.createdAt} />} />
        {transition.note && <EpBlockRow label="Note" icon={StickyNote} value={transition.note} />}
      </EpSection>
    </EpMobileCard>
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
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
               <Skeleton className="h-9 w-9 rounded-full shrink-0" />
               <div className="space-y-1.5 flex-1">
                 <Skeleton className="h-4 w-32" />
                 <Skeleton className="h-3 w-20" />
               </div>
            </div>
          </li>
        ))}
      </ul>
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
    <ul className="space-y-3">
      {transitions.map((t) => (
        <TransitionMobileCard
          key={t.id}
          transition={t}
          departmentMembers={departmentMembers}
          onAssignEp={onAssignEp}
          isAssigningId={isAssigningId}
        />
      ))}
    </ul>
  );
}
