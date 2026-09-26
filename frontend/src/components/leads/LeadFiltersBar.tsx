/*
  Server-side filter bar for the Leads and Sign-ups page.

  Only search here. Each department has a single product (GV / GTA / GTE), and
  the caller's department is enforced server-side, so a product filter would
  either be the same as "current department" or expose data the caller cannot
  see anyway.
*/

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { LeadFilters } from '@/types/lead';
import { cn } from '@/lib/utils';

interface LeadFiltersBarProps {
  onFiltersChange: (filters: LeadFilters) => void;
  dispatchButton?: React.ReactNode;
}

export function LeadFiltersBar({ onFiltersChange, dispatchButton }: LeadFiltersBarProps) {
  const [params, setParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const search = params.get('search') ?? undefined;

  // Debounce search -> URL param after 300ms idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput) next.set('search', searchInput);
        else next.delete('search');
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setParams]);

  // Notify parent whenever URL params change
  useEffect(() => {
    onFiltersChange({ search });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  const hasActiveFilters = !!search;

  function clearFilters() {
    setSearchInput('');
    setParams({}, { replace: true });
  }

  const filtersList = (
    <>
      {/* Clear */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden flex items-center",
          hasActiveFilters ? "w-8 opacity-100 ml-1" : "w-0 opacity-0 ml-0"
        )}
      >
        <Button
          id="leads-clear-filters"
          variant="ghost"
          size="icon"
          onClick={clearFilters}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Clear filters"
          tabIndex={hasActiveFilters ? 0 : -1}
        >
          <X size={16} />
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card">
      {/* Search */}
      <div className="relative flex-1 min-w-44">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="leads-search"
          type="text"
          placeholder="Search by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 pl-9 text-xs rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Clear (only appears while search has content) */}
      {filtersList}

      {/* Optional Dispatch Button Node */}
      {dispatchButton && (
        <div className="pl-2 border-l shrink-0">
          {dispatchButton}
        </div>
      )}
    </div>
  );
}
