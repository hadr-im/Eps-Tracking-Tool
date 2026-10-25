/*
  Filters for the Approved EPs tracker.

  There is deliberately no product filter. Approvals belong to the department
  the caller signs in under, and the backend resolves that from the token and
  rejects any other department, so a product dropdown could only ever offer
  the one value the page already shows.
*/

import { EpFilterBar } from '@/components/filters/EpFilterBar';
import { FilterSelect } from '@/components/filters/FilterSelect';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { UNIVERSITIES } from '@/lib/options';
import type { ApprovedEpFilters } from '@/types/approvedEp';
import type { EpStatus } from '@/types/ep';

const APPROVED_STATUSES = [
  { value: 'APPROVED',  label: 'Approved'  },
  { value: 'REALIZED',  label: 'Realized'  },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FINISHED',  label: 'Finished'  },
];

interface ApprovedEpsFiltersProps {
  filters: ApprovedEpFilters;
  onChange: (next: ApprovedEpFilters) => void;
}

export function ApprovedEpsFilters({ filters, onChange }: ApprovedEpsFiltersProps) {
  function update(patch: Partial<ApprovedEpFilters>) {
    onChange({ ...filters, ...patch });
  }

  const hasActiveFilters = !!(
    filters.status ||
    filters.university ||
    filters.createdFrom ||
    filters.createdTo
  );

  return (
    <EpFilterBar
      idPrefix="approved"
      search={filters.search ?? ''}
      onSearchChange={(v) => update({ search: v || undefined })}
      placeholder="Search EP name or ID…"
      hasActiveFilters={hasActiveFilters}
      onClearFilters={() => onChange({})}
      filters={
        <>
          <FilterSelect
            value={filters.status}
            onChange={(v) => update({ status: v as EpStatus | undefined })}
            options={APPROVED_STATUSES}
            allLabel="All statuses"
            className="w-32"
          />
          <FilterSelect
            value={filters.university}
            onChange={(v) => update({ university: v })}
            options={UNIVERSITIES}
            allLabel="All universities"
            className="w-40"
          />
          <DateRangeFilter
            from={filters.createdFrom}
            to={filters.createdTo}
            onChange={({ from, to }) => update({ createdFrom: from, createdTo: to })}
          />
        </>
      }
    />
  );
}
