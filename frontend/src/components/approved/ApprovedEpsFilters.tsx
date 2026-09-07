import { useId } from 'react';
import { Search, X } from 'lucide-react';
import { Input }  from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ApprovedEpFilters } from '@/types/approvedEp';
import type { EpStatus } from '@/types/ep';

const PRODUCTS = ['GV', 'GTA', 'GTE'] as const;

const APPROVED_STATUSES: { value: EpStatus; label: string }[] = [
  { value: 'APPROVED',  label: 'Approved'  },
  { value: 'REALIZED',  label: 'Realized'  },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FINISHED',  label: 'Finished'  },
];

interface ApprovedEpsFiltersProps {
  filters: ApprovedEpFilters;
  onChange: (next: ApprovedEpFilters) => void;
  totalCount: number;
}

export function ApprovedEpsFilters({ filters, onChange, totalCount }: ApprovedEpsFiltersProps) {
  const searchId  = useId();
  const productId = useId();
  const statusId  = useId();

  const hasActiveFilters = !!(filters.product || filters.status || filters.search);

  function update(patch: Partial<ApprovedEpFilters>) {
    onChange({ ...filters, ...patch });
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          id={searchId}
          type="search"
          placeholder="Search EP name or ID…"
          value={filters.search ?? ''}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className="pl-8 h-8 w-52 text-xs"
          aria-label="Search approved EPs"
        />
      </div>

      {/* Product */}
      <Select
        value={filters.product ?? 'all'}
        onValueChange={(v) => update({ product: !v || v === 'all' ? undefined : v })}
      >
        <SelectTrigger
          id={productId}
          className="h-8 w-32 text-xs"
          aria-label="Filter by product"
        >
          <SelectValue placeholder="Product">
            {(v) => (v === 'all' || !v ? 'All products' : v)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" label="All products">All products</SelectItem>
          {PRODUCTS.map((p) => (
            <SelectItem key={p} value={p} label={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) => update({ status: v === 'all' ? undefined : (v as EpStatus) })}
      >
        <SelectTrigger
          id={statusId}
          className="h-8 w-36 text-xs"
          aria-label="Filter by status"
        >
          <SelectValue placeholder="Status">
            {(v) => (v === 'all' || !v ? 'All statuses' : APPROVED_STATUSES.find((s) => s.value === v)?.label ?? v)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" label="All statuses">All statuses</SelectItem>
          {APPROVED_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} label={s.label}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear all */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={clearAll}
          aria-label="Clear all filters"
        >
          <X size={12} />
          Clear
        </Button>
      )}

      {/* Result count */}
      <span className="ml-auto text-xs text-muted-foreground shrink-0">
        {totalCount} EP{totalCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
