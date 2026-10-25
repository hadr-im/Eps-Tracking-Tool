/*
  The one filter bar. Dispatch, Approved EPs, EPs Under Process, Manual Leads
  and Transitioned EPs all render this, so they share a layout instead of five
  near-identical ones that drift every time a page is touched.

  The structure is fixed: search takes the free width, the filters sit to its
  right at their natural size, then page actions, then the count badge. On
  narrow screens the filters move into a bottom sheet so the search field keeps
  the row to itself.
*/

import type { ReactNode } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { SoftBadge } from '@/components/ui/soft-badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface EpFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** The filter controls, rendered inline on desktop and in a sheet on mobile. */
  filters?: ReactNode;
  /** True when any filter is set — drives the clear button and the mobile dot. */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  /** Page-specific buttons, e.g. Add lead or Dispatch. */
  actions?: ReactNode;
  /** Total matching rows. Rendered as a badge. */
  count?: number;
  countLabel?: string;
  /** Distinguishes the inputs when more than one bar is mounted. */
  idPrefix?: string;
}

export function EpFilterBar({
  search,
  onSearchChange,
  placeholder = 'Search by name…',
  filters,
  hasActiveFilters = false,
  onClearFilters,
  actions,
  count,
  countLabel = 'EP',
  idPrefix = 'eps',
}: EpFilterBarProps) {
  const showClear = hasActiveFilters || !!search;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search — takes whatever width the rest does not need */}
      <div className="relative min-w-44 flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={`${idPrefix}-search`}
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 rounded-lg border-0 bg-muted pl-8 text-xs focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={placeholder}
        />
      </div>

      {/* Desktop filters */}
      {filters && (
        <div className="hidden shrink-0 items-center gap-2 md:flex">{filters}</div>
      )}

      {/* Mobile filters — one button opening a sheet, so the search keeps the row */}
      {filters && (
        <div className="flex shrink-0 md:hidden">
          <Sheet>
            <SheetTrigger
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'relative h-8 w-8 rounded-lg bg-transparent p-0 text-xs',
              })}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={15} />
              {hasActiveFilters && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-sidebar-primary" />
              )}
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl p-5">
              <SheetHeader className="mb-4 p-0 text-left">
                <SheetTitle className="text-sm font-semibold">Filters</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 [&>*]:w-full">{filters}</div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Clear — collapses rather than unmounting, so the row does not jump
          the moment the first filter is set. */}
      {onClearFilters && (
        <div
          className={cn(
            'flex items-center overflow-hidden transition-all duration-300 ease-in-out',
            showClear ? 'w-8 opacity-100' : 'w-0 opacity-0',
          )}
        >
          <Button
            id={`${idPrefix}-clear`}
            variant="ghost"
            size="icon"
            onClick={onClearFilters}
            className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            title="Clear filters"
            aria-label="Clear filters"
            tabIndex={showClear ? 0 : -1}
          >
            <X size={15} />
          </Button>
        </div>
      )}

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}

      {count !== undefined && (
        <SoftBadge tone="blue" className="shrink-0 px-2.5 py-1 text-xs">
          {count} {countLabel}
          {count !== 1 ? 's' : ''}
        </SoftBadge>
      )}
    </div>
  );
}
