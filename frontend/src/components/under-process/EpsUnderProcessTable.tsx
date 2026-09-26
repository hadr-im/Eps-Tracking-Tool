import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { ExternalLink, Check, X as XIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadgeCell } from '@/components/crm/cells/StatusBadgeCell';
import { DateCell }        from '@/components/crm/cells/DateCell';
import { TransitionCell }  from '@/components/crm/cells/TransitionCell';
import { TruncatedText }   from '@/components/crm/cells/TruncatedText';
import type { Ep, EpStatus } from '@/types/ep';
import { BAND_CLASS, bandStyle, TABLE_CONTAINER_CLASS, type BandTone } from "@/components/ui/data-table";
import { SoftBadge, type SoftBadgeTone } from '@/components/ui/soft-badge';

// ── Column groups ─────────────────────────────────────────────────────────────

interface ColumnGroup {
  label: string;
  tone: BandTone;
  columnIds: string[];
}

// Bands step through the shared 1..5 scale so the groups read left-to-right
// as a light-to-dark progression, matching the CRM and Approved EPs tables.
const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'Identity',
    tone: 1,
    columnIds: ['statusOnExpa', 'id', 'createdAtExpa', 'email', 'phone'],
  },
  {
    label: 'Academic',
    tone: 2,
    columnIds: ['university', 'fieldOfStudy', 'yearOfStudy'],
  },
  {
    label: 'CRM Status',
    tone: 3,
    columnIds: ['source', 'cvLink', 'assignedAt', 'contactedAt', 'contacted', 'interested'],
  },
  {
    label: 'CRM Details',
    tone: 4,
    columnIds: ['trackingPhase', 'notes', 'duration', 'availability'],
  },
  {
    label: 'Actions',
    tone: 5,
    columnIds: ['transition', 'comments'],
  },
];

// Props 

interface EpsUnderProcessTableProps {
  eps: Ep[];
  // Map of ownerId (member display name built from useDepartmentMembers)
  memberMap: Record<string, string>;
  isLoading: boolean;
  onCommentClick?: (ep: Ep) => void;
  commentCounts?: Record<string, number>;
  onTransition?: (epId: string, targetProduct: string) => void;
  pendingId?: string | null;
}

// Sticky offsets

const STICKY_OFFSET: Record<string, number> = {
  fullName:   0,
  memberName: 180,
};

// Inline cell helpers 

function TextCell({ value, mono = false }: { value: string | number | null; mono?: boolean }) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground text-xs">—</span>;
  // IDs and short values render as-is; anything long gets the truncated cell
  // with the shared hover popup, so an overflowing email or university never
  // pushes the row wider than the rest.
  if (mono) {
    return <span className="text-xs whitespace-nowrap font-mono">{String(value)}</span>;
  }
  return (
    <TruncatedText
      value={String(value)}
      className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden"
    />
  );
}

function BoolCell({ value }: { value: boolean }) {
  return value
    ? <Check size={14} className="text-emerald-500 mx-auto" />
    : <XIcon  size={14} className="text-muted-foreground/40 mx-auto" />;
}

function LinkCell({ href, label }: { href: string | null; label?: string }) {
  if (!href) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-25"
      title={href}
    >
      {label ?? 'Link'}
      <ExternalLink size={10} className="shrink-0" />
    </a>
  );
}

const PHASE_TONES: Record<string, SoftBadgeTone> = {
  WAITING_FOR_ANSWER:        'neutral',
  EP_NOT_RESPONDING:         'red',
  EXPLAINING_AIESEC:         'blue',
  LOOKING_FOR_OPPORTUNITIES: 'blue',
  HAVING_INTERVIEW:          'dispatcher',
  WILL_SIGN_CONTRACT:        'amber',
  CONTRACT_SIGNED:           'green',
  WAITING_FOR_CV:            'amber',
  NOT_INTERESTED_ANYMORE:    'red',
};

function PhaseCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const label = value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const tone: SoftBadgeTone = PHASE_TONES[value] ?? 'neutral';
  return <SoftBadge tone={tone}>{label}</SoftBadge>;
}

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (!isSorted)        return <ArrowUpDown size={11} className="text-muted-foreground/50 ml-1 shrink-0" />;
  if (isSorted === 'asc') return <ArrowUp   size={11} className="ml-1 shrink-0" />;
  return                        <ArrowDown  size={11} className="ml-1 shrink-0" />;
}

// Column definitions 

const col = createColumnHelper<Ep>();

function buildColumns(
  memberMap: Record<string, string>,
  onCommentClick?: (ep: Ep) => void,
  commentCounts: Record<string, number> = {},
  onTransition?: (epId: string, targetProduct: string) => void,
  pendingId?: string | null,
): ColumnDef<Ep, any>[] {
  return [

    // Sticky: Full Name 
    col.accessor('fullName', {
      id: 'fullName',
      header: () => <div className="text-center w-full">Full Name</div>,
      cell: (info) => (
        <span className="font-medium text-sm whitespace-nowrap">{info.getValue()}</span>
      ),
      enableSorting: true,
      meta: { sticky: 'left', stickyOffset: 0, minWidth: 180 },
    }),

    // Sticky: Member Name 
    col.accessor('ownerId', {
      id: 'memberName',
      header: () => <div className="text-center w-full">Member</div>,
      cell: (info) => {
        const name = info.getValue() ? memberMap[info.getValue()!] : null;
        return (
          <span className="text-xs whitespace-nowrap font-medium">
            {name ?? <span className="text-muted-foreground">—</span>}
          </span>
        );
      },
      enableSorting: true,
      sortingFn: (a, b) => {
        const na = a.original.ownerId ? (memberMap[a.original.ownerId] ?? '') : '';
        const nb = b.original.ownerId ? (memberMap[b.original.ownerId] ?? '') : '';
        return na.localeCompare(nb);
      },
      meta: { sticky: 'left', stickyOffset: 180, minWidth: 140 },
    }),

    // Identity 
    col.accessor('statusOnExpa', {
      id: 'statusOnExpa',
      header: () => <div className="text-center w-full">Status</div>,
      cell: (info) => (
        <div className="flex justify-center">
          <StatusBadgeCell status={info.getValue() as EpStatus} />
        </div>
      ),
      enableSorting: true,
      meta: { minWidth: 110 },
    }),
    col.accessor('id', {
      id: 'id',
      header: 'EP ID',
      cell: (info) => <TextCell value={info.getValue()} mono />,
      enableSorting: false,
      meta: { minWidth: 90 },
    }),
    col.accessor('createdAtExpa', {
      id: 'createdAtExpa',
      header: 'Created',
      cell: (info) => <DateCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 100 },
    }),
    col.accessor('email', {
      id: 'email',
      header: 'Email',
      cell: (info) => <TextCell value={info.getValue()} />,
      enableSorting: false,
      meta: { minWidth: 180 },
    }),
    col.accessor('phone', {
      id: 'phone',
      header: 'Phone',
      cell: (info) => <TextCell value={info.getValue()} />,
      enableSorting: false,
      meta: { minWidth: 130 },
    }),

    // Academic 
    col.accessor('university', {
      id: 'university',
      header: 'University',
      cell: (info) => <TextCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 160 },
    }),
    col.accessor('fieldOfStudy', {
      id: 'fieldOfStudy',
      header: 'Field of Study',
      cell: (info) => <TextCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 150 },
    }),
    col.accessor('yearOfStudy', {
      id: 'yearOfStudy',
      header: 'Year',
      cell: (info) => <TextCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 65 },
    }),

    // CRM Status 
    col.accessor('source', {
      id: 'source',
      header: 'Source',
      cell: (info) => <TextCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 100 },
    }),
    col.accessor('cvLink', {
      id: 'cvLink',
      header: 'CV',
      cell: (info) => <LinkCell href={info.getValue()} label="CV" />,
      enableSorting: false,
      meta: { minWidth: 80 },
    }),
    col.accessor('assignedAt', {
      id: 'assignedAt',
      header: 'Assigned At',
      cell: (info) => <DateCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 110 },
    }),
    col.accessor('contactedAt', {
      id: 'contactedAt',
      header: 'Contacted At',
      cell: (info) => <DateCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 115 },
    }),
    col.accessor('contacted', {
      id: 'contacted',
      header: 'Contacted',
      cell: (info) => <BoolCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 90 },
    }),
    col.accessor('interested', {
      id: 'interested',
      header: 'Interested',
      cell: (info) => <BoolCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 90 },
    }),

    // CRM Details
    col.accessor('trackingPhase', {
      id: 'trackingPhase',
      header: 'Tracking Phase',
      cell: (info) => <PhaseCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 190 },
    }),
    col.accessor('notes', {
      id: 'notes',
      header: 'Notes',
      cell: (info) => (
        <TruncatedText
          value={info.getValue() as string | null}
          className="text-xs max-w-50 block truncate whitespace-nowrap overflow-hidden text-left"
        />
      ),
      enableSorting: false,
      meta: { minWidth: 200 },
    }),
    col.accessor('duration', {
      id: 'duration',
      header: 'Duration',
      cell: (info) => {
        const v = info.getValue() as string | null;
        if (!v) return <span className="text-muted-foreground text-xs">—</span>;
        return <span className="text-xs">{v.charAt(0) + v.slice(1).toLowerCase()}</span>;
      },
      enableSorting: true,
      meta: { minWidth: 90 },
    }),
    col.accessor('availability', {
      id: 'availability',
      header: 'Availability',
      cell: (info) => {
        const v = info.getValue() as string | null;
        if (!v) return <span className="text-muted-foreground text-xs">—</span>;
        const label = v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return <span className="text-xs whitespace-nowrap">{label}</span>;
      },
      enableSorting: true,
      meta: { minWidth: 120 },
    }),

    // Transition
    col.display({
      id: 'transition',
      header: 'Transition',
      cell: (info) => {
        if (!onTransition) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <TransitionCell
            epId={info.row.original.id}
            currentProduct={info.row.original.product}
            isPending={pendingId === info.row.original.id}
            onTransition={onTransition}
          />
        );
      },
      meta: { minWidth: 100 },
    }),

    // Comments
    ...(onCommentClick
      ? [
          col.display({
            id: 'comments',
            header: () => <div className="text-center w-full">Comments</div>,
            cell: (info) => {
              const ep    = info.row.original;
              const count = commentCounts[ep.id] ?? 0;
              return (
                <button
                  type="button"
                  onClick={() => onCommentClick(ep)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold underline text-foreground hover:text-aiesec-blue transition-colors"
                  aria-label={`View comments for ${ep.fullName}`}
                >
                  View comments
                  {count > 0 && (
                    <span className="no-underline inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </button>
              );
            },
            meta: { minWidth: 80 },
          }),
        ]
      : []),
  ];
}

// Group-band colspan helper 

function buildGroupSpans(allColumnIds: string[]) {
  return COLUMN_GROUPS.map((g) => ({
    label: g.label,
    span: g.columnIds.filter((id) => allColumnIds.includes(id)).length,
    tone: g.tone,
  })).filter((g) => g.span > 0);
}

// Component

export function EpsUnderProcessTable({
  eps,
  memberMap,
  isLoading,
  onCommentClick,
  commentCounts = {},
  onTransition,
  pendingId,
}: EpsUnderProcessTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => buildColumns(memberMap, onCommentClick, commentCounts, onTransition, pendingId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memberMap, onCommentClick, commentCounts, onTransition, pendingId],
  );

  const table = useReactTable({
    data: eps,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const allIds     = table.getAllLeafColumns().map((c) => c.id);
  const groupSpans = buildGroupSpans(allIds);

  return (
      <Table
        className="w-max min-w-full table-fixed border-separate border-spacing-0"
        containerClassName={TABLE_CONTAINER_CLASS}
      >
      <TableHeader className="sticky top-0 z-40 bg-card">
        {/* Group band */}
        <TableRow className="border-b-0">
          {/* Spacer over the two sticky columns */}
          <TableHead
            colSpan={2}
              className="sticky left-0 z-30 border-r border-b bg-card text-xs font-semibold"
          />
          {groupSpans.map((g) => (
            <TableHead
              key={g.label}
              colSpan={g.span}
              className={`${BAND_CLASS} border-l border-black/5`}
                style={bandStyle(g.tone)}
            >
              {g.label}
            </TableHead>
          ))}
        </TableRow>

        {/* Column headers */}
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="bg-muted">
            {headerGroup.headers.map((header) => {
              const meta     = header.column.columnDef.meta ?? {};
              const isSticky = meta.sticky === 'left';
              const canSort  = header.column.getCanSort();
              const sorted   = header.column.getIsSorted();

              return (
                <TableHead
                  key={header.id}
                  style={{
                    minWidth: meta.minWidth ?? 90,
                    width:    meta.minWidth ?? 90,
                    ...(isSticky
                      ? { position: 'sticky', left: STICKY_OFFSET[header.id] ?? 0, zIndex: 20 }
                      : {}),
                  }}
                  className={`whitespace-nowrap text-center align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-r border-b border-border last:border-r-0 ${
                    isSticky ? 'bg-muted' : 'bg-muted'
                  } ${canSort ? 'cursor-pointer select-none' : ''}`}
                  onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                >
                  <div className="inline-flex items-center justify-center gap-0.5">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {canSort && <SortIcon isSorted={sorted} />}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>

      <TableBody>
        {/* Loading skeleton */}
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={`skel-${i}`}>
              {columns.map((_, ci) => (
                <TableCell key={ci} className="border-r last:border-r-0 py-2">
                  <Skeleton className="h-4 w-full rounded" />
                </TableCell>
              ))}
            </TableRow>
          ))}

        {/* Data rows */}
        {!isLoading &&
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-muted/60 transition-colors group">
              {row.getVisibleCells().map((cell) => {
                const meta     = cell.column.columnDef.meta ?? {};
                const isSticky = meta.sticky === 'left';

                return (
                  <TableCell
                    key={cell.id}
                    style={{
                      minWidth: meta.minWidth ?? 90,
                      width:    meta.minWidth ?? 90,
                      ...(isSticky
                        ? { position: 'sticky', left: STICKY_OFFSET[cell.column.id] ?? 0, zIndex: 10 }
                        : {}),
                    }}
                    className={`border-r border-border last:border-r-0 py-2 text-center align-middle ${
                      isSticky ? 'bg-card group-hover:bg-[color-mix(in_srgb,var(--muted)_60%,var(--card))] transition-colors' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}

        {/* Empty state */}
        {!isLoading && eps.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-40 text-center text-muted-foreground text-sm"
            >
              No EPs are currently looking for opportunities.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
