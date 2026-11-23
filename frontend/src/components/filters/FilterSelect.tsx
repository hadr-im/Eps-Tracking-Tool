/*
  The dropdown every filter bar uses.

  Each page was spelling out its own Select with its own width, its own "All X"
  sentinel and its own active-state classes, which is why the bars had drifted
  apart. One component keeps them identical and makes adding a filter to a page
  a single line.

  `undefined` is the unset value everywhere; the "all" sentinel exists only
  because a Select cannot hold undefined as an item value.
*/

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSearchInput,
  SelectTrigger,
  SelectValue,
  matchesQuery,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/*
  Past this many options, scrolling stops being a way to find anything and
  the popup grows a search field.

  A threshold rather than a flag on each use: the lists that need it are the
  ones that are long — 27 universities, 40 fields of study — and the ones
  that do not are short by nature. Status has seven and year of study five,
  so neither gets one, which is the intent; a list that grows past this later
  gets a search without anyone having to remember to ask for it.
*/
export const SEARCH_THRESHOLD = 8;

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: readonly FilterOption[] | readonly string[];
  // Shown when nothing is picked, e.g. "All universities".
  allLabel: string;
  className?: string;
  ariaLabel?: string;
  // Defaults to on for long lists. Pass false to suppress it outright.
  searchable?: boolean;
}

function normalise(
  options: readonly FilterOption[] | readonly string[],
): FilterOption[] {
  return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  className,
  ariaLabel,
  searchable,
}: FilterSelectProps) {
  const items = normalise(options);
  const isActive = !!value;

  const [query, setQuery] = useState('');
  const showSearch = searchable ?? items.length > SEARCH_THRESHOLD;
  const visible = query ? items.filter((o) => matchesQuery(o.label, query)) : items;

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(v) => onChange(!v || v === 'all' ? undefined : String(v))}
      // A query left behind would silently hide most of the list the next
      // time the popup opened.
      onOpenChange={(open) => { if (!open) setQuery(''); }}
    >
      <SelectTrigger
        className={cn(
          'h-8 text-xs transition-colors',
          isActive &&
            'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground focus:ring-0',
          className,
        )}
        aria-label={ariaLabel ?? allLabel}
      >
        <SelectValue placeholder={allLabel}>
          {(v) =>
            !v || v === 'all'
              ? allLabel
              : items.find((o) => o.value === v)?.label ?? String(v)
          }
        </SelectValue>
      </SelectTrigger>

      {/*
        text-xs matches the trigger and the items inherit it.

        The width is reset off the anchor: the popup defaults to the trigger's
        width, and these triggers are deliberately narrow, so a long name like
        "ISITCOM Hammam Sousse" was being cut off mid-word. It now grows to fit
        its longest item while never dropping below the trigger's width, and
        stops short of the viewport edge on a phone.
      */}
      <SelectContent className="max-h-72 w-auto! min-w-(--anchor-width) max-w-[min(90vw,22rem)] text-xs">
        {showSearch && (
          <SelectSearchInput value={query} onChange={setQuery} placeholder={`Search ${allLabel.replace(/^All /i, '')}…`} />
        )}

        {/* "All X" clears the filter, so it stays put while searching. */}
        {!query && (
          <SelectItem value="all" label={allLabel}>
            {allLabel}
          </SelectItem>
        )}

        {visible.map((o) => (
          <SelectItem key={o.value} value={o.value} label={o.label}>
            {o.label}
          </SelectItem>
        ))}

        {query && visible.length === 0 && (
          <p className="px-3 py-4 text-center text-muted-foreground">Nothing matches “{query}”</p>
        )}
      </SelectContent>
    </Select>
  );
}
