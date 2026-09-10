import { Badge } from '@/components/ui/badge';
import type { EpStatus } from '@/types/ep';

const STATUS_CONFIG: Record<EpStatus, { label: string; className: string }> = {
  LEAD:        { label: 'Lead',        className: 'bg-sidebar-primary text-sidebar-primary-foreground border-transparent' },
  CONTACTED:   { label: 'Contacted',   className: 'bg-blue-500    text-white border-blue-500'    },
  INTERESTED:  { label: 'Interested',  className: 'bg-violet-500  text-white border-violet-500'  },
  APPROVED:    { label: 'Approved',    className: 'bg-amber-500   text-white border-amber-500'   },
  REALIZED:    { label: 'Realized',    className: 'bg-emerald-500 text-white border-emerald-500' },
  COMPLETED:   { label: 'Completed',   className: 'bg-green-600   text-white border-green-600'   },
  FINISHED:    { label: 'Finished',    className: 'bg-gray-400    text-white border-gray-400'    },
};

interface StatusBadgeCellProps {
  status: EpStatus;
}

export function StatusBadgeCell({ status }: StatusBadgeCellProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
