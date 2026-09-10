import { useId } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input }  from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
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

  const filtersList = (
    <>
      {/* Product */}
      <Select
        value={filters.product ?? 'all'}
        onValueChange={(v) => update({ product: !v || v === 'all' ? undefined : v })}
      >
        <SelectTrigger
          id={productId}
          className={cn(
            "h-8 w-32 text-xs transition-all duration-300 ease-in-out",
            filters.product && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0"
          )}
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
          className={cn(
            "h-8 w-36 text-xs transition-all duration-300 ease-in-out",
            filters.status && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0"
          )}
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
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden flex items-center",
          hasActiveFilters ? "w-8 opacity-100 ml-1" : "w-0 opacity-0 ml-0"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          onClick={clearAll}
          aria-label="Clear all filters"
          title="Clear all filters"
          tabIndex={hasActiveFilters ? 0 : -1}
        >
          <X size={16} />
        </Button>
      </div>
    </>
  );

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
          className="pl-8 h-8 w-52 text-xs border-0"
          aria-label="Search approved EPs"
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        {filtersList}
      </div>

      {/* Mobile Filters Button */}
      <div className="flex md:hidden">
        <Sheet>
          <SheetTrigger 
            className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 w-8 p-0 text-xs bg-transparent relative" })} 
            aria-label="Open filters"
          >
            <SlidersHorizontal size={16} />
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-sidebar-primary" />
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl p-5">
            <SheetHeader className="mb-4 p-0 text-left">
              <SheetTitle className="text-sm font-semibold">Filters</SheetTitle>
            </SheetHeader>
            <div className="flex flex-wrap items-center gap-2">
              {filtersList}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Result count */}
      <span className="ml-auto text-xs text-muted-foreground shrink-0">
        {totalCount} EP{totalCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
