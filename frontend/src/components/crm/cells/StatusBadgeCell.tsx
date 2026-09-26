import type { EpStatus } from '@/types/ep';
import { SoftBadge, type SoftBadgeTone } from '@/components/ui/soft-badge';

/*
  Status pills — soft-badge style, same shape as the dispatcher chip.

  The tone climbs the funnel:
    LEAD -> neutral
    CONTACTED -> blue
    INTERESTED -> dispatcher (violet) — a distinct interim step
    APPROVED -> amber
    REALIZED / COMPLETED / FINISHED -> green (with deepening implied by icon-free reads)
*/
const STATUS_CONFIG: Record<EpStatus, { label: string; tone: SoftBadgeTone }> = {
  LEAD:       { label: 'Lead',       tone: 'neutral' },
  CONTACTED:  { label: 'Contacted',  tone: 'blue' },
  INTERESTED: { label: 'Interested', tone: 'dispatcher' },
  APPROVED:   { label: 'Approved',   tone: 'amber' },
  REALIZED:   { label: 'Realized',   tone: 'green' },
  COMPLETED:  { label: 'Completed',  tone: 'green' },
  FINISHED:   { label: 'Finished',   tone: 'neutral' },
};

interface StatusBadgeCellProps {
  status: EpStatus;
}

export function StatusBadgeCell({ status }: StatusBadgeCellProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, tone: 'neutral' as SoftBadgeTone };
  return <SoftBadge tone={config.tone}>{config.label}</SoftBadge>;
}
