import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Duration } from '@/types/ep';

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 'LONG',  label: 'Long' },
  { value: 'MID',   label: 'Mid' },
  { value: 'SHORT', label: 'Short' },
];

interface DurationCellProps {
  id: string;
  value: Duration | null;
  isPending: boolean;
  onUpdate: (id: string, field: string, value: string | null) => void;
}

export function DurationCell({ id, value, isPending, onUpdate }: DurationCellProps) {
  return (
    <Select
      value={value ?? ''}
      disabled={isPending}
      onValueChange={(v) => onUpdate(id, 'duration', v || null)}
    >
      <SelectTrigger
        id={`duration-${id}`}
        className="h-7 w-full min-w-fit px-2 py-1 text-xs border-dashed bg-transparent"
        aria-label="Duration"
      >
        <SelectValue placeholder="set duration" className="justify-center">
          {(v) => (v ? DURATIONS.find((d) => d.value === v)?.label ?? v : 'set duration')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {DURATIONS.map((p) => (
          <SelectItem key={p.value} value={p.value} className="text-xs">
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
