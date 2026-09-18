import { useState, useMemo, useCallback } from 'react';
import { useTransitions } from '@/hooks/useTransitions';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { useDispatch } from '@/hooks/useDispatch';
import { TransitionedEpsTable } from '@/components/transitions/TransitionedEpsTable';

export default function TransitionedEpsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  
  const { data: transitions = [], isLoading } = useTransitions();
  const { data: members = [] } = useDepartmentMembers(user?.departmentId ?? null);
  const { mutate: dispatchMutate, isPending: isAssigning, variables: dispatchVariables } = useDispatch();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transitions;
    return transitions.filter(
      (t) =>
        t.ep?.fullName.toLowerCase().includes(q) ||
        t.ep?.id.toLowerCase().includes(q),
    );
  }, [transitions, search]);

  const handleAssignEp = useCallback((epId: string, memberId: string) => {
    dispatchMutate({ epIds: [epId], memberId });
  }, [dispatchMutate]);
  
  const isAssigningId = isAssigning && dispatchVariables ? dispatchVariables.epIds[0] : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 bg-card">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Oversight
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Transitioned EPs</h1>
        <p className="text-sm text-muted-foreground">
          View EPs transitioned in or out of your department
        </p>
      </div>

      {/* Search + count bar */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            id="transitions-search"
            type="search"
            placeholder="Search EP name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-52 text-xs border-0"
            aria-label="Search transitioned EPs"
          />
        </div>
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden flex items-center",
            search ? "w-8 opacity-100 ml-1" : "w-0 opacity-0 ml-0"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            title="Clear search"
            tabIndex={search ? 0 : -1}
          >
            <X size={16} />
          </Button>
        </div>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">
          {filtered.length} EP{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-6 py-6 overflow-auto">
        <TransitionedEpsTable
          transitions={filtered}
          isLoading={isLoading}
          departmentMembers={members}
          onAssignEp={user?.isDispatcher ? handleAssignEp : undefined}
          isAssigningId={isAssigningId}
        />
      </div>
    </div>
  );
}