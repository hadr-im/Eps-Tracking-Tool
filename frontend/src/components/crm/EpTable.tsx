//  EpTable: Desktop CRM data grid using TanStack Table v8
// - Member Name + Full Name columns are sticky (position: sticky; left: 0)
// - Columns are grouped under colored header bands
// - All inline editing is done via shared cell components

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadgeCell }     from './cells/StatusBadgeCell';
import { CheckboxCell }        from './cells/CheckboxCell';
import { TrackingPhaseCell }   from './cells/TrackingPhaseCell';
import { EditableTextCell }    from './cells/EditableTextCell';
import { DateCell }            from './cells/DateCell';
import { TransitionCell }      from './cells/TransitionCell';
import { DurationCell }        from './cells/DurationCell';
import { AvailabilityCell }    from './cells/AvailabilityCell';
import type { Ep, TrackingPhase } from '@/types/ep';

// Column group metadata 

interface ColumnGroup {
  label: string;
  headerClass: string;     
  columnIds: string[];
}

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'General Info',
    headerClass: 'bg-blue-500 text-white border-blue-500',
    columnIds: ['statusOnExpa', 'id', 'createdAtExpa', 'email', 'phone', 'university', 'fieldOfStudy', 'yearOfStudy'],
  },
  {
    label: 'CRM',
    headerClass: 'bg-amber-500 text-white border-amber-500',
    columnIds: ['source', 'cvLink', 'assignedAt', 'contactedAt', 'contacted', 'interested', 'trackingPhase', 'notes'],
  },
  {
    label: 'Interests',
    headerClass: 'bg-emerald-500 text-white border-emerald-500',
    columnIds: ['duration', 'availability'],
  },
  {
    label: 'Transition',
    headerClass: 'bg-violet-500 text-white border-violet-500',
    columnIds: ['transition'],
  },
];

// Props 

interface EpTableProps {
  eps: Ep[];
  isLoading: boolean;
  pendingId: string | null;        // ID of the EP currently being mutated
  onCheckboxUpdate: (id: string, field: 'contacted' | 'interested', value: boolean) => void;
  onPhaseUpdate:    (id: string, phase: TrackingPhase | null) => void;
  onTextUpdate:     (id: string, field: string, value: string | null) => void;
  // Transition mutation handler
  onTransition?:    (id: string, targetProduct: string) => void;
  // When true: all inputs are disabled/hidden + table is read-only (TL/VP oversight view) 
  readOnly?: boolean;
  // When provided: a Comments column is added with a click handler per row
  onCommentClick?: (ep: Ep) => void;
  // Per-EP comment counts (key = EP id, value = count)  displayed on the comment icon badge 
  commentCounts?: Record<string, number>;
}

// Column definitions 

const col = createColumnHelper<Ep>();

function buildColumns(props: Omit<EpTableProps, 'eps' | 'isLoading'>): ColumnDef<Ep, any>[] {
  const { pendingId, onCheckboxUpdate, onPhaseUpdate, onTextUpdate, onTransition, readOnly = false, onCommentClick, commentCounts = {} } = props;

  return [
    // Frozen left columns 
    col.accessor('fullName', {
      id: 'fullName',
      header: () => <div className="text-center w-full">Full Name</div>,
      cell: (info) => (
        <span className="font-medium text-sm whitespace-nowrap">{info.getValue()}</span>
      ),
      meta: { sticky: 'left', stickyOffset: 0, minWidth: 160 },
    }),

    // General Info 
    col.accessor('statusOnExpa', {
      id: 'statusOnExpa',
      header: () => <div className="text-center w-full">Status</div>,
      cell: (info) => (
        <div className="flex justify-center">
          <StatusBadgeCell status={info.getValue()} />
        </div>
      ),
      meta: { minWidth: 100 },
    }),
    col.accessor('id', {
      id: 'id',
      header: 'EP ID',
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
      ),
      meta: { minWidth: 80 },
    }),
    col.accessor('createdAtExpa', {
      id: 'createdAtExpa',
      header: 'Created',
      cell: (info) => <DateCell value={info.getValue()} />,
      meta: { minWidth: 100 },
    }),
    col.accessor('email', {
      id: 'email',
      header: 'Email',
      cell: (info) => (
        <span className="text-xs truncate max-w-40 block">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 160 },
    }),
    col.accessor('phone', {
      id: 'phone',
      header: 'Phone',
      cell: (info) => (
        <span className="text-xs whitespace-nowrap">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 110 },
    }),
    col.accessor('university', {
      id: 'university',
      header: 'University',
      cell: (info) => (
        <span className="text-xs">{info.getValue() ?? <span className="text-muted-foreground">—</span>}</span>
      ),
      meta: { minWidth: 130 },
    }),
    col.accessor('fieldOfStudy', {
      id: 'fieldOfStudy',
      header: 'Field of Study',
      cell: (info) => (
        <span className="text-xs">{info.getValue() ?? <span className="text-muted-foreground">—</span>}</span>
      ),
      meta: { minWidth: 130 },
    }),
    col.accessor('yearOfStudy', {
      id: 'yearOfStudy',
      header: 'Year',
      cell: (info) => (
        <span className="text-xs">{info.getValue() ?? <span className="text-muted-foreground">—</span>}</span>
      ),
      meta: { minWidth: 60 },
    }),

    // CRM 
    col.accessor('source', {
      id: 'source',
      header: 'Source',
      cell: (info) => readOnly ? (
        <span className="text-xs">{info.getValue() ?? <span className="text-muted-foreground">—</span>}</span>
      ) : (
        <EditableTextCell
          id={info.row.original.id}
          field="source"
          value={info.getValue()}
          isPending={pendingId === info.row.original.id}
          onUpdate={onTextUpdate}
        />
      ),
      meta: { minWidth: 120 },
    }),
    col.accessor('cvLink', {
      id: 'cvLink',
      header: 'CV Link',
      cell: (info) => {
        const link = info.getValue() as string | null;
        if (link) {
          return (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate block max-w-30"
            >
              {link}
            </a>
          );
        }
        if (readOnly) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <EditableTextCell
            id={info.row.original.id}
            field="cvLink"
            value={null}
            isPending={pendingId === info.row.original.id}
            onUpdate={onTextUpdate}
          />
        );
      },
      meta: { minWidth: 120 },
    }),
    col.accessor('assignedAt', {
      id: 'assignedAt',
      header: 'Assigned At',
      cell: (info) => <DateCell value={info.getValue()} />,
      meta: { minWidth: 100 },
    }),
    col.accessor('contactedAt', {
      id: 'contactedAt',
      header: 'Contacted At',
      cell: (info) => <DateCell value={info.getValue()} withTime />,
      meta: { minWidth: 130 },
    }),
    col.accessor('contacted', {
      id: 'contacted',
      header: 'Contacted',
      cell: (info) => readOnly ? (
        <span className={`text-xs font-medium ${info.getValue() ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {info.getValue() ? 'Yes' : 'No'}
        </span>
      ) : (
        <CheckboxCell
          id={info.row.original.id}
          field="contacted"
          value={info.getValue()}
          isPending={pendingId === info.row.original.id}
          onUpdate={onCheckboxUpdate}
        />
      ),
      meta: { minWidth: 80 },
    }),
    col.accessor('interested', {
      id: 'interested',
      header: 'Interested',
      cell: (info) => readOnly ? (
        <span className={`text-xs font-medium ${info.getValue() ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {info.getValue() ? 'Yes' : 'No'}
        </span>
      ) : (
        <CheckboxCell
          id={info.row.original.id}
          field="interested"
          value={info.getValue()}
          isPending={pendingId === info.row.original.id}
          onUpdate={onCheckboxUpdate}
        />
      ),
      meta: { minWidth: 80 },
    }),
    col.accessor('trackingPhase', {
      id: 'trackingPhase',
      header: 'Phase',
      cell: (info) => readOnly ? (
        <span className="text-xs">
          {info.getValue()
            ? info.getValue()!.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
            : <span className="text-muted-foreground">—</span>}
        </span>
      ) : (
        <TrackingPhaseCell
          id={info.row.original.id}
          value={info.getValue()}
          isPending={pendingId === info.row.original.id}
          onUpdate={onPhaseUpdate}
        />
      ),
      meta: { minWidth: 190 },
    }),
    col.accessor('notes', {
      id: 'notes',
      header: 'Notes',
      cell: (info) => readOnly ? (
        <span className="text-xs max-w-50 block whitespace-pre-wrap">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ) : (
        <EditableTextCell
          id={info.row.original.id}
          field="notes"
          value={info.getValue()}
          isPending={pendingId === info.row.original.id}
          multiline
          placeholder="Add note…"
          onUpdate={onTextUpdate}
        />
      ),
      meta: { minWidth: 200 },
    }),

    // Interests 
    col.accessor('duration', {
      id: 'duration',
      header: 'Duration',
      cell: (info) => {
        if (readOnly) {
          const v = info.getValue();
          if (!v) return <span className="text-muted-foreground text-xs">—</span>;
          return <span className="text-xs">{v.charAt(0) + v.slice(1).toLowerCase()}</span>;
        }
        return (
          <DurationCell
            id={info.row.original.id}
            value={info.getValue()}
            isPending={pendingId === info.row.original.id}
            onUpdate={onTextUpdate}
          />
        );
      },
      enableSorting: true,
      meta: { minWidth: 120 },
    }),
    col.accessor('availability', {
      id: 'availability',
      header: 'Availability',
      cell: (info) => {
        if (readOnly) {
          const v = info.getValue();
          if (!v) return <span className="text-muted-foreground text-xs">—</span>;
          const label = v.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          return <span className="text-xs whitespace-nowrap">{label}</span>;
        }
        return (
          <AvailabilityCell
            id={info.row.original.id}
            value={info.getValue()}
            isPending={pendingId === info.row.original.id}
            onUpdate={onTextUpdate}
          />
        );
      },
      enableSorting: true,
      meta: { minWidth: 150 },
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

    // Comments (injected when onCommentClick is provided)
    ...(onCommentClick
      ? [
          col.display({
            id: 'comments',
            header: () => <div className="text-center w-full">Comments</div>,
            cell: (info) => {
              const ep = info.row.original;
              const count = commentCounts[ep.id] ?? 0;
              return (
                <button
                  type="button"
                  onClick={() => onCommentClick(ep)}
                  className="relative inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label={`View comments for ${ep.fullName}`}
                >
                  <MessageSquare size={15} strokeWidth={1.6} />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white">
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

// Helpers 

// Builds the group-header colspan map: { groupLabel → colSpan }
function buildGroupSpans(allColumnIds: string[]): { label: string; span: number; headerClass: string }[] {
  return COLUMN_GROUPS.map((g) => ({
    label: g.label,
    span: g.columnIds.filter((id) => allColumnIds.includes(id)).length,
    headerClass: g.headerClass,
  })).filter((g) => g.span > 0);
}

// Component 

export function EpTable({
  eps,
  isLoading,
  pendingId,
  onCheckboxUpdate,
  onPhaseUpdate,
  onTextUpdate,
  onTransition,
  readOnly = false,
  onCommentClick,
  commentCounts = {},
}: EpTableProps) {
  // Memoize so TanStack Table never sees new column objects unless handlers change
  // (avoids unnecessary re-renders and internal state resets)
  const columns = useMemo(
    () => buildColumns({ pendingId, onCheckboxUpdate, onPhaseUpdate, onTextUpdate, onTransition, readOnly, onCommentClick, commentCounts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingId, onCheckboxUpdate, onPhaseUpdate, onTextUpdate, onTransition, readOnly, onCommentClick, commentCounts],
  );

  const table = useReactTable({
    data: eps,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const allIds = table.getAllLeafColumns().map((c) => c.id);
  const groupSpans = buildGroupSpans(allIds);

  // Sticky offsets: fullName is at left=0 (min-width 160px)
  const STICKY_OFFSET: Record<string, number> = {
    fullName: 0,
  };

  return (
    <Table
      className="w-max min-w-full table-fixed"
      containerClassName="relative w-full h-full overflow-auto rounded-xl border bg-card"
    >
      <TableHeader className="sticky top-0 z-40 bg-card">
        {/* Column group band */}
          <TableRow className="border-b-0">
            {/* Frozen header spacer: spans the sticky columns */}
            <TableHead
              colSpan={1}
              className="sticky left-0 z-30 border-r bg-card text-xs font-semibold shadow-[1px_0_0_0_var(--border)]"
            >
              {/* Empty: sits above Full Name */}
            </TableHead>
            {/* Group headers */}
            {groupSpans.map((g) => (
              <TableHead
                key={g.label}
                colSpan={g.span}
                className={`border-l text-center text-xs font-semibold tracking-wide py-1.5 ${g.headerClass}`}
              >
                {g.label}
              </TableHead>
            ))}
          </TableRow>

          {/* Column headers */}
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/40">
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta ?? {};
                const isSticky = meta.sticky === 'left';

                return (
                  <TableHead
                    key={header.id}
                    style={{
                      minWidth: meta.minWidth ?? 90,
                      width: meta.minWidth ?? 90,
                      ...(isSticky
                        ? { position: 'sticky', left: STICKY_OFFSET[header.id] ?? 0, zIndex: 20 }
                        : {}),
                    }}
                    className={`whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 ${
                      isSticky ? 'bg-background shadow-[1px_0_0_0_var(--border)]' : 'bg-muted/40'
                    }`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
              <TableRow
                key={row.id}
                className="hover:bg-muted/30 transition-colors group"
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta ?? {};
                  const isSticky = meta.sticky === 'left';

                  return (
                    <TableCell
                      key={cell.id}
                      style={{
                        minWidth: meta.minWidth ?? 90,
                        width: meta.minWidth ?? 90,
                        ...(isSticky
                          ? { position: 'sticky', left: STICKY_OFFSET[cell.column.id] ?? 0, zIndex: 10 }
                          : {}),
                      }}
                      className={`border-r last:border-r-0 py-2 text-center align-middle ${
                        isSticky
                          ? 'bg-background group-hover:bg-muted transition-colors shadow-[1px_0_0_0_var(--border)]'
                          : ''
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
              <TableCell colSpan={columns.length} className="h-40 text-center text-muted-foreground text-sm">
                No EPs found. Try adjusting your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
    </Table>
  );
}
