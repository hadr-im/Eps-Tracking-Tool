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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  return (
    <Select
      value={current}
      disabled={isPending}
      onValueChange={(v) => onUpdate(id, field, !v || v === CLEAR ? null : String(v))}
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
        {unlisted && (
          <SelectItem value={current} label={current}>
            {current}
          </SelectItem>
        )}
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value} label={o.label}>
            {o.label}
          </SelectItem>
        ))}
        {current && (
          <SelectItem value={CLEAR} label="Clear">
            <span className="text-muted-foreground">Clear</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
