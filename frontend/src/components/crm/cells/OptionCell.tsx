/*
  An editable CRM field backed by a fixed list of answers.

  University, field of study, year and source all come from the sign-up form
  and all need correcting now and then — a lead picks the wrong university
  from a long list, or skips the question. Editing them as free text would put
  the drift back that the fixed lists were introduced to remove: "Friend" and
  "a friend" as separate sources, one lead whose source was "aaa". So the CRM
  offers the same options the form does, and nothing else.

  Clearing is deliberately possible: a wrong answer is worse than none.
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
import { SEARCH_THRESHOLD } from '@/components/filters/FilterSelect';

export interface CellOption {
  value: string;
  label: string;
}

interface OptionCellProps {
  id: string;
  field: string;
  value: string | number | null;
  options: readonly CellOption[] | readonly string[];
  placeholder: string;
  isPending: boolean;
  onUpdate: (id: string, field: string, value: string | null) => void;
  // Widens the popup past the trigger, for the long university names.
  wide?: boolean;
}

const CLEAR = '__clear__';

function normalise(
  options: readonly CellOption[] | readonly string[],
): CellOption[] {
  return options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

export function OptionCell({
  id,
  field,
  value,
  options,
  placeholder,
  isPending,
  onUpdate,
  wide = false,
}: OptionCellProps) {
  const items = normalise(options);
  const current = value === null || value === undefined ? '' : String(value);

  /*
    A value already in the data that is not on the list — an old free-text
    answer, or one the form has since dropped. It is still shown, so editing a
    neighbouring field cannot silently blank it, but it is not offered again.
  */
  const unlisted = current && !items.some((o) => o.value === current);

  /*
    Searchable once the list is long — the universities and the fields of
    study, not the year. Same threshold the filter bar uses, so correcting a
    university in the CRM and filtering by one behave alike.
  */
  const [query, setQuery] = useState('');
  const showSearch = items.length > SEARCH_THRESHOLD;
  const visible = query ? items.filter((o) => matchesQuery(o.label, query)) : items;

  return (
    <Select
      value={current}
      disabled={isPending}
      onValueChange={(v) => onUpdate(id, field, !v || v === CLEAR ? null : String(v))}
      onOpenChange={(open) => { if (!open) setQuery(''); }}
    >
      <SelectTrigger
        id={`${field}-${id}`}
        className="h-8 w-full min-w-fit rounded-lg border border-border bg-transparent px-3 py-1 text-xs"
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder}>
          {(v) =>
            v ? (items.find((o) => o.value === v)?.label ?? String(v)) : placeholder
          }
        </SelectValue>
      </SelectTrigger>

      <SelectContent
        className={
          wide
            ? 'max-h-72 w-auto! min-w-(--anchor-width) max-w-[min(90vw,22rem)] text-xs'
            : 'max-h-72 text-xs'
        }
      >
        {showSearch && (
          <SelectSearchInput value={query} onChange={setQuery} placeholder={`Search ${placeholder}…`} />
        )}

        {unlisted && !query && (
          <SelectItem value={current} label={current}>
            {current}
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

        {/* Clearing is an action on the field, not a search result. */}
        {current && !query && (
          <SelectItem value={CLEAR} label="Clear">
            <span className="text-muted-foreground">Clear</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
