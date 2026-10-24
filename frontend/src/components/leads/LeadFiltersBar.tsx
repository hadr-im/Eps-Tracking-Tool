/*
  Search bar for the Dispatch page.

  Only search: each department has a single product, and the caller's
  department is enforced server-side, so a product filter would either repeat
  "current department" or expose data the caller cannot see anyway.

  The layout itself lives in LeadsToolbar, shared with Manual Leads and
  Transitioned EPs. What this adds is the URL binding — the Dispatch page keeps
  its search in the query string so a filtered view can be linked to — plus the
  debounce that stops a request firing on every keystroke.
*/

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LeadsToolbar } from './LeadsToolbar';
import type { LeadFilters } from '@/types/lead';

interface LeadFiltersBarProps {
  onFiltersChange: (filters: LeadFilters) => void;
  canDispatch?: boolean;
  selectedCount?: number;
  onDispatch?: () => void;
}

export function LeadFiltersBar({
  onFiltersChange,
  canDispatch,
  selectedCount,
  onDispatch,
}: LeadFiltersBarProps) {
  const [params, setParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const search = params.get('search') ?? undefined;

  // Debounce search -> URL param after 300ms idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput) next.set('search', searchInput);
          else next.delete('search');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setParams]);

  // Notify parent whenever URL params change
  useEffect(() => {
    onFiltersChange({ search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  return (
    <LeadsToolbar
      idPrefix="leads"
      search={searchInput}
      onSearchChange={setSearchInput}
      canDispatch={canDispatch}
      selectedCount={selectedCount}
      onDispatch={onDispatch}
    />
  );
}
