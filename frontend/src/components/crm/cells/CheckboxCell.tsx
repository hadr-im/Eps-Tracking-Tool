import { Checkbox } from '@/components/ui/checkbox';

interface CheckboxCellProps {
  id: string;
  field: 'contacted' | 'interested';
  value: boolean;
  isPending: boolean;
  onUpdate: (id: string, field: 'contacted' | 'interested', value: boolean) => void;
}

/*
  Contacted is one-way: once a member marks someone as contacted it stays
  ticked, since the outreach itself cannot be undone. Interested stays a normal
  toggle — how an EP feels about the offer genuinely does change.
*/
function isLocked(field: CheckboxCellProps['field'], value: boolean) {
  return field === 'contacted' && value;
}

export function CheckboxCell({ id, field, value, isPending, onUpdate }: CheckboxCellProps) {
  const locked = isLocked(field, value);

  return (
    <div className="flex items-center">
      <Checkbox
        id={`${field}-${id}`}
        checked={value}
        disabled={isPending || locked}
        onCheckedChange={(checked) => onUpdate(id, field, Boolean(checked))}
        className={`border-2 border-foreground/40 ${
          isPending ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          /*
            Locked is deliberately not dimmed: it is a recorded fact, not an
            unavailable control, so it keeps full contrast and only loses the
            pointer.
          */
          locked ? 'cursor-default opacity-100 data-[state=checked]:opacity-100' : ''
        }`}
        aria-label={field}
        title={locked ? 'Contacted cannot be undone' : undefined}
      />
    </div>
  );
}
