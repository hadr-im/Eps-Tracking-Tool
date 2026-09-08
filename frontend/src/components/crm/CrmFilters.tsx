// Filters bar for the My CRM page
// All values are synced to URL search params via useSearchParams 
// Search input is debounced 300ms to avoid hammering the server

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { TRACKING_PHASE_LABELS } from '@/components/crm/cells/TrackingPhaseCell';
import type { EpFilters, TrackingPhase, Duration } from '@/types/ep';

const TRACKING_PHASES = Object.entries(TRACKING_PHASE_LABELS) as [TrackingPhase, string][];

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 'LONG',  label: 'Long' },
  { value: 'MID',   label: 'Mid' },
  { value: 'SHORT', label: 'Short' },
];

interface CrmFiltersProps {
  onFiltersChange: (filters: EpFilters) => void;
}

export function CrmFilters({ onFiltersChange }: CrmFiltersProps) {
  const [params, setParams] = useSearchParams();

  // Local controlled state for the search input (debounced separately)
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');

  // Derive current filter values from URL params
  const trackingPhase = (params.get('trackingPhase') as TrackingPhase | null) ?? undefined;
  const contacted     = (params.get('contacted') as 'true' | 'false' | null) ?? undefined;
  const interested    = (params.get('interested') as 'true' | 'false' | null) ?? undefined;
  const duration      = (params.get('duration') as Duration | null) ?? undefined;
  const search        = params.get('search') ?? undefined;

  // Debounce search input → update URL param after 300ms idle
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
    onFiltersChange({
      search,
      trackingPhase,
      contacted,
      interested,
      duration,
    });
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

  const hasActiveFilters = !!(search || trackingPhase || contacted || interested || duration);

  function clearFilters() {
    setSearchInput('');
    setParams({});
  }

  const filtersList = (
    <>
      {/* Tracking Phase */}
      <Select
        value={trackingPhase ?? ''}
        onValueChange={(v) => setParam('trackingPhase', v || null)}
      >
        <SelectTrigger 
          id="filter-phase" 
          className={cn(
            "h-8 w-auto min-w-44 text-xs transition-all duration-300 ease-in-out",
            trackingPhase && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0"
          )}
        >
          <SelectValue placeholder="Phase">
            {(v) => (v ? TRACKING_PHASE_LABELS[v as TrackingPhase] ?? v : 'Phase')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TRACKING_PHASES.map(([value, label]) => (
            <SelectItem key={value} value={value} label={label} className="text-xs">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Contacted */}
      <Select
        value={contacted ?? ''}
        onValueChange={(v) => setParam('contacted', v || null)}
      >
        <SelectTrigger 
          id="filter-contacted" 
          className={cn(
            "h-8 w-auto min-w-32 text-xs transition-all duration-300 ease-in-out",
            contacted && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0"
          )}
        >
          <SelectValue placeholder="Contacted">
            {(v) => (v === 'true' ? 'Contacted' : v === 'false' ? 'Not Contacted' : 'Contacted')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true" label="Contacted" className="text-xs">Contacted</SelectItem>
          <SelectItem value="false" label="Not Contacted" className="text-xs">Not Contacted</SelectItem>
        </SelectContent>
      </Select>

      {/* Interested */}
      <Select
        value={interested ?? ''}
        onValueChange={(v) => setParam('interested', v || null)}
      >
        <SelectTrigger 
          id="filter-interested" 
          className={cn(
            "h-8 w-auto min-w-32 text-xs transition-all duration-300 ease-in-out",
            interested && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0"
          )}
        >
          <SelectValue placeholder="Interested">
            {(v) => (v === 'true' ? 'Interested' : v === 'false' ? 'Not Interested' : 'Interested')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true" label="Interested" className="text-xs">Interested</SelectItem>
          <SelectItem value="false" label="Not Interested" className="text-xs">Not Interested</SelectItem>
        </SelectContent>
      </Select>

      {/* Duration */}
      <Select
        value={duration ?? ''}
        onValueChange={(v) => setParam('duration', v || null)}
      >
        <SelectTrigger 
          id="filter-duration" 
          className={cn(
            "h-8 w-auto min-w-28 text-xs transition-all duration-300 ease-in-out",
            duration && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0"
          )}
        >
          <SelectValue placeholder="Duration">
            {(v) => (v ? DURATIONS.find((d) => d.value === v)?.label ?? v : 'Duration')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DURATIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value} label={label} className="text-xs">
              {label}
            </SelectItem>
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
          id="clear-filters"
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
      <div className="relative flex-1 min-w-45">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="crm-search"
          type="text"
          placeholder="Search by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 pl-8 text-xs"
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
              <SheetDescription className="sr-only">Filter CRM EPs</SheetDescription>
            </SheetHeader>
            <div className="flex flex-wrap items-center gap-2">
              {filtersList}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
