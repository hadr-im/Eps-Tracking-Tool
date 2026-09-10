import { Checkbox } from '@/components/ui/checkbox';

interface CheckboxCellProps {
  id: string;
  field: 'contacted' | 'interested';
  value: boolean;
  isPending: boolean;
  onUpdate: (id: string, field: 'contacted' | 'interested', value: boolean) => void;
}

export function CheckboxCell({ id, field, value, isPending, onUpdate }: CheckboxCellProps) {
  return (
    <div className="flex items-center">
      <Checkbox
        id={`${field}-${id}`}
        checked={value}
        disabled={isPending}
        onCheckedChange={(checked) => onUpdate(id, field, Boolean(checked))}
        className={isPending ? 'opacity-50 cursor-not-allowed' : ''}
        aria-label={field}
      />
    </div>
  );
}
