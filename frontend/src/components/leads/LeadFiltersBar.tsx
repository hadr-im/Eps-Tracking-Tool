// Server-side filter bar for the Leads and Sign-ups page
// Filters: debounced search (full name), product (GV/GTA/GTE)
// All values are synced to URL search params for shareable/bookmarkable state

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import type { LeadFilters } from '@/types/lead';
import { cn } from '@/lib/utils';

const PRODUCTS = ['GV', 'GTA', 'GTE'] as const;

interface LeadFiltersBarProps {
  onFiltersChange: (filters: LeadFilters) => void;
  dispatchButton?: React.ReactNode;
}

export function LeadFiltersBar({ onFiltersChange, dispatchButton }: LeadFiltersBarProps) {
  const [params, setParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');

  const product = params.get('product') ?? undefined;
  const search  = params.get('search')  ?? undefined;

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
    onFiltersChange({ search, product });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  function setParam(key: string, value: string | null) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }

  const hasActiveFilters = !!(search || product);

  function clearFilters() {
    setSearchInput('');
    setParams({}, { replace: true });
  }

  const filtersList = (
    <>
      {/* Product */}
      <Select value={product ?? 'all'} onValueChange={(v) => setParam('product', v === 'all' ? null : v)}>
        <SelectTrigger 
          id="filter-product" 
          className={cn(
            "h-8 w-auto min-w-28 text-xs transition-all duration-300 ease-in-out",
            product && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0"
          )}
        >
          <SelectValue placeholder="Product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Products</SelectItem>
          {PRODUCTS.map((p) => (
            <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

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
          className="h-8 pl-8 text-xs border-0 bg-transparent"
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {filtersList}
      </div>

      {/* Mobile Filters Button */}
      <div className="flex md:hidden">
        <Sheet>
          <SheetTrigger 
            className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 w-8 p-0 text-xs bg-transparent relative border-0" })} 
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

      {/* Optional Dispatch Button Node */}
      {dispatchButton && (
        <div className="pl-2 border-l shrink-0">
          {dispatchButton}
        </div>
      )}
    </div>
  );
}
