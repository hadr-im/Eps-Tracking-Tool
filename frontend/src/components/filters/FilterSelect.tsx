/*
  The dropdown every filter bar uses.

  Each page was spelling out its own Select with its own width, its own "All X"
  sentinel and its own active-state classes, which is why the bars had drifted
  apart. One component keeps them identical and makes adding a filter to a page
  a single line.

  `undefined` is the unset value everywhere; the "all" sentinel exists only
  because a Select cannot hold undefined as an item value.
*/

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
}: FilterSelectProps) {
  const items = normalise(options);
  const isActive = !!value;

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(v) => onChange(!v || v === 'all' ? undefined : String(v))}
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
        <SelectItem value="all" label={allLabel}>
          {allLabel}
        </SelectItem>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value} label={o.label}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
