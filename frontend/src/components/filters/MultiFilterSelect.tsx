/*
  A filter that holds several values at once.

  FilterSelect covers the common case of one choice, but "show me what I gave
  to these three people" needs more than one, and a Select cannot express that
  — picking a second option would replace the first. This is a popover of
  checkboxes instead, which also makes the current selection readable without
  opening it: the trigger names one, counts the rest.
*/

import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface MultiFilterOption {
  value: string;
  label: string;
}

interface MultiFilterSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: readonly MultiFilterOption[];
  allLabel: string;
  className?: string;
}

export function MultiFilterSelect({
  values,
  onChange,
  options,
  allLabel,
  className,
}: MultiFilterSelectProps) {
  const isActive = values.length > 0;

  function toggle(value: string) {
    onChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );
  }

  // One name reads better than "1 selected"; past that a count is the only
  // thing that fits.
  const label = !isActive
    ? allLabel
    : values.length === 1
      ? options.find((o) => o.value === values[0])?.label ?? '1 selected'
      : `${values.length} selected`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 justify-between gap-1.5 text-xs font-normal transition-colors',
              isActive &&
                'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground',
              className,
            )}
            aria-label={allLabel}
          />
        }
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className="shrink-0 opacity-60" />
      </PopoverTrigger>

      <PopoverContent className="max-h-72 w-56 overflow-y-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No members yet
          </p>
        ) : (
          options.map((o) => {
            const checked = values.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    checked
                      ? 'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'border-foreground/30',
                  )}
                >
                  {checked && <Check size={11} />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })
        )}

        {isActive && (
          <div className="mt-1 flex justify-end border-t pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => onChange([])}
            >
              <X size={12} /> Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
