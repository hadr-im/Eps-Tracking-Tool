// Server-side filter bar for the Leads and Sign-ups page
// Filters: debounced search (full name), product (GV/GTA/GTE)
// All values are synced to URL search params for shareable/bookmarkable state

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LeadFilters } from '@/types/lead';

const PRODUCTS = ['GV', 'GTA', 'GTE'] as const;

interface LeadFiltersBarProps {
  onFiltersChange: (filters: LeadFilters) => void;
}

export function LeadFiltersBar({ onFiltersChange }: LeadFiltersBarProps) {
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
      });
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
    });
  }

  const hasActiveFilters = !!(search || product);

  function clearFilters() {
    setSearchInput('');
    setParams({});
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
      {/* Search */}
      <div className="relative flex-1 min-w-44">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="leads-search"
          type="text"
          placeholder="Search by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Product */}
      <Select value={product ?? ''} onValueChange={(v) => setParam('product', v || null)}>
        <SelectTrigger id="filter-product" className="h-8 w-auto min-w-28 text-xs">
          <SelectValue placeholder="Product" />
        </SelectTrigger>
        <SelectContent>
          {PRODUCTS.map((p) => (
            <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          id="leads-clear-filters"
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X size={12} />
          Clear
        </Button>
      )}
    </div>
  );
}
