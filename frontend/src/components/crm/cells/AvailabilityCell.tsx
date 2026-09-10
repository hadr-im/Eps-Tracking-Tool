import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Availability } from '@/types/ep';

const AVAILABILITIES: { value: Availability; label: string }[] = [
  { value: 'THIS_SUMMER', label: 'This Summer' },
  { value: 'THIS_WINTER', label: 'This Winter' },
  { value: 'NEXT_SUMMER', label: 'Next Summer' },
  { value: 'NEXT_WINTER', label: 'Next Winter' },
];

interface AvailabilityCellProps {
  id: string;
  value: Availability | null;
  isPending: boolean;
  onUpdate: (id: string, field: string, value: string | null) => void;
}

export function AvailabilityCell({ id, value, isPending, onUpdate }: AvailabilityCellProps) {
  return (
    <Select
      value={value ?? ''}
      disabled={isPending}
      onValueChange={(v) => onUpdate(id, 'availability', v || null)}
    >
      <SelectTrigger
        id={`availability-${id}`}
        className="h-8 w-full min-w-fit px-3 py-1 text-xs border border-border bg-transparent rounded-full"
        aria-label="Availability"
      >
        <SelectValue placeholder="set availability" className="justify-center">
          {(v) => (v ? AVAILABILITIES.find((a) => a.value === v)?.label ?? v : 'set availability')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {AVAILABILITIES.map((p) => (
          <SelectItem key={p.value} value={p.value} className="text-xs">
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
