/*
  The filter bar shared by every lead-style page: Dispatch, Manual Leads and
  Transitioned EPs.

  These three show the same kind of thing — a pool of EPs you tick and assign —
  so they should not look like three different screens. Keeping the search
  field, the clear affordance and the Dispatch button in one component is what
  stops them drifting apart as each page is edited.

  Search state lives with the caller: Dispatch keeps it in the URL so a filtered
  view can be shared, while the others keep it local.
*/

import type { ReactNode } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LeadsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** Page-specific controls, placed before the Dispatch button. */
  actions?: ReactNode;
  /** Hides the Dispatch button entirely for roles that cannot assign. */
  canDispatch?: boolean;
  selectedCount?: number;
  onDispatch?: () => void;
  /** Distinguishes the search inputs when more than one page is mounted. */
  idPrefix?: string;
}

export function LeadsToolbar({
  search,
  onSearchChange,
  placeholder = 'Search by name…',
  actions,
  canDispatch = false,
  selectedCount = 0,
  onDispatch,
  idPrefix = 'leads',
}: LeadsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card">
      <div className="relative flex-1 min-w-44">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          id={`${idPrefix}-search`}
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-xs rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Collapses to nothing rather than unmounting, so the row does not jump
          as soon as the first character is typed. */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden flex items-center',
          search ? 'w-8 opacity-100 ml-1' : 'w-0 opacity-0 ml-0',
        )}
      >
        <Button
          id={`${idPrefix}-clear-search`}
          variant="ghost"
          size="icon"
          onClick={() => onSearchChange('')}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Clear search"
          tabIndex={search ? 0 : -1}
        >
          <X size={16} />
        </Button>
      </div>

      {actions && <div className="shrink-0">{actions}</div>}

      {canDispatch && onDispatch && (
        <div className="pl-2 border-l shrink-0">
          <Button
            size="sm"
            onClick={onDispatch}
            disabled={selectedCount === 0}
            className="h-8 gap-1.5 text-xs ml-1"
          >
            Dispatch {selectedCount > 0 ? `(${selectedCount})` : ''}
            <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
