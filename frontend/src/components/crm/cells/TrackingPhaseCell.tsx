import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TrackingPhase } from '@/types/ep';

const PHASES: { value: TrackingPhase; label: string }[] = [
  { value: 'WAITING_FOR_ANSWER',       label: 'Waiting for Answer' },
  { value: 'EP_NOT_RESPONDING',        label: 'EP Not Responding' },
  { value: 'EXPLAINING_AIESEC',        label: 'Explaining AIESEC' },
  { value: 'LOOKING_FOR_OPPORTUNITIES',label: 'Looking for Opportunities' },
  { value: 'HAVING_INTERVIEW',         label: 'Having Interview' },
  { value: 'WILL_SIGN_CONTRACT',       label: 'Will Sign Contract' },
  { value: 'CONTRACT_SIGNED',          label: 'Contract Signed' },
  { value: 'WAITING_FOR_CV',           label: 'Waiting for CV' },
  { value: 'NOT_INTERESTED_ANYMORE',   label: 'Not Interested Anymore' },
];

interface TrackingPhaseCellProps {
  id: string;
  value: TrackingPhase | null;
  isPending: boolean;
  onUpdate: (id: string, phase: TrackingPhase | null) => void;
}

export function TrackingPhaseCell({ id, value, isPending, onUpdate }: TrackingPhaseCellProps) {
  return (
    <Select
      value={value ?? ''}
      disabled={isPending}
      onValueChange={(v) => onUpdate(id, v ? (v as TrackingPhase) : null)}
    >
      <SelectTrigger
        id={`phase-${id}`}
        className="h-8 w-full min-w-fit px-3 py-1 text-xs border border-border bg-transparent rounded-full"
        aria-label="Tracking phase"
      >
        <SelectValue placeholder="set phase" className="justify-center">
          {(v) => (v ? PHASES.find((p) => p.value === v)?.label ?? v : 'set phase')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PHASES.map((p) => (
          <SelectItem key={p.value} value={p.value} className="text-xs">
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Export phase labels for reuse in filters
export const TRACKING_PHASE_LABELS: Record<TrackingPhase, string> = Object.fromEntries(
  PHASES.map(({ value, label }) => [value, label]),
) as Record<TrackingPhase, string>;
