/*
  Filter bar for the Dispatch page.

  No product filter: each department has a single product and the caller's
  department is enforced server-side, so it would either repeat "current
  department" or offer data the caller cannot see anyway.

  The layout lives in EpFilterBar, shared with every other list page. What this
  adds is the URL binding — Dispatch keeps its filters in the query string so a
  filtered view can be linked to and survives a refresh — plus the debounce
  that stops a request firing on every keystroke.
*/

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EpFilterBar } from '@/components/filters/EpFilterBar';
import { MultiFilterSelect } from '@/components/filters/MultiFilterSelect';
import { useAuth } from '@/hooks/useAuth';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { FilterSelect } from '@/components/filters/FilterSelect';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { UNIVERSITIES, FIELDS_OF_STUDY, YEARS_OF_STUDY } from '@/lib/options';
import type { LeadFilters } from '@/types/lead';

interface LeadFiltersBarProps {
  onFiltersChange: (filters: LeadFilters) => void;
  canDispatch?: boolean;
  selectedCount?: number;
  onDispatch?: () => void;
}

// Everything except search, which is debounced separately.
const PARAM_KEYS = ['university', 'fieldOfStudy', 'yearOfStudy', 'createdFrom', 'createdTo', 'ownerIds'] as const;

export function LeadFiltersBar({
  onFiltersChange,
  canDispatch,
  selectedCount,
  onDispatch,
}: LeadFiltersBarProps) {
  const [params, setParams] = useSearchParams();

  // Who the department's leads can be dispatched to, for the member filter.
  const { user } = useAuth();
  const { data: members = [] } = useDepartmentMembers(user?.departmentId ?? null);
  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: m.fullName })),
    [members],
  );

  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const search = params.get('search') ?? undefined;

  const read = (key: string) => params.get(key) ?? undefined;

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
    onFiltersChange({
      search,
      ownerIds: read('ownerIds')?.split(',').filter(Boolean) ?? [],
      university: read('university'),
      fieldOfStudy: read('fieldOfStudy'),
      yearOfStudy: read('yearOfStudy'),
      createdFrom: read('createdFrom'),
      createdTo: read('createdTo'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  function setParam(patch: Record<string, string | undefined>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => {
          if (v) next.set(k, v);
          else next.delete(k);
        });
        return next;
      },
      { replace: true },
    );
  }

  const hasActiveFilters = PARAM_KEYS.some((k) => !!params.get(k));

  function clearAll() {
    setSearchInput('');
    setParams(new URLSearchParams(), { replace: true });
  }

  return (
    <EpFilterBar
      idPrefix="leads"
      search={searchInput}
      onSearchChange={setSearchInput}
      placeholder="Search name, phone or EP ID…"
      hasActiveFilters={hasActiveFilters}
      onClearFilters={clearAll}
      filters={
        <>
          <FilterSelect
            value={read('university')}
            onChange={(v) => setParam({ university: v })}
            options={UNIVERSITIES}
            allLabel="All universities"
            className="w-40"
          />
          <FilterSelect
            value={read('fieldOfStudy')}
            onChange={(v) => setParam({ fieldOfStudy: v })}
            options={FIELDS_OF_STUDY}
            allLabel="All fields"
            className="w-36"
          />
          <FilterSelect
            value={read('yearOfStudy')}
            onChange={(v) => setParam({ yearOfStudy: v })}
            options={YEARS_OF_STUDY}
            allLabel="All years"
            className="w-28"
          />
          <MultiFilterSelect
            values={read('ownerIds')?.split(',').filter(Boolean) ?? []}
            onChange={(ids) => setParam({ ownerIds: ids.length ? ids.join(',') : undefined })}
            options={memberOptions}
            allLabel="All members"
            className="w-36"
          />
          <DateRangeFilter
            from={read('createdFrom')}
            to={read('createdTo')}
            onChange={({ from, to }) => setParam({ createdFrom: from, createdTo: to })}
          />
        </>
      }
      actions={
        canDispatch && onDispatch ? (
          <Button
            size="sm"
            onClick={onDispatch}
            disabled={!selectedCount}
            className="h-8 gap-1.5 text-xs"
          >
            Dispatch {selectedCount ? `(${selectedCount})` : ''}
            <ChevronRight size={14} />
          </Button>
        ) : null
      }
    />
  );
}
