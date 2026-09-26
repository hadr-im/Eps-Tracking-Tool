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
import { TruncatedText }       from './cells/TruncatedText';
import { DateCell }            from './cells/DateCell';
import { TransitionCell }      from './cells/TransitionCell';
import { DurationCell }        from './cells/DurationCell';
import { AvailabilityCell }    from './cells/AvailabilityCell';
import type { Ep, TrackingPhase } from '@/types/ep';
import { BAND_CLASS, bandStyle, TABLE_CONTAINER_CLASS, type BandTone } from '@/components/ui/data-table';

// Column group metadata 

interface ColumnGroup {
  label: string;
  tone: BandTone;
  columnIds: string[];
}

/*
  Group bands. Filled and gradient-shaded, white text — see bandStyle().
  The tone names map to the shared --band-* tokens so every wide table in the
  app bands its columns the same way.
*/
const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: 'General Info',
    tone: 1,
    columnIds: ['statusOnExpa', 'id', 'createdAtExpa', 'email', 'phone', 'university', 'fieldOfStudy', 'yearOfStudy'],
  },
  {
    label: 'CRM',
    tone: 2,
    columnIds: ['source', 'cvLink', 'assignedAt', 'contactedAt', 'contacted', 'interested', 'trackingPhase', 'notes'],
  },
  {
    label: 'Interests',
    tone: 3,
    columnIds: ['duration', 'availability'],
  },
  {
    label: 'Transition',
    tone: 4,
    columnIds: ['transition'],
  },
  {
    label: 'Comments',
    tone: 5,
    columnIds: ['comments'],
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
  onTransition?:    (id: string, targetProduct: string, note?: string) => void;
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
        <TruncatedText
          value={info.getValue()}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden"
        />
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
        <TruncatedText
          value={info.getValue()}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden"
        />
      ),
      meta: { minWidth: 130 },
    }),
    col.accessor('fieldOfStudy', {
      id: 'fieldOfStudy',
      header: 'Field of Study',
      cell: (info) => (
        <TruncatedText
          value={info.getValue()}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden"
        />
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
        <TruncatedText
          value={info.getValue()}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden mx-auto"
        />
      ) : (
        <div className="flex justify-center w-full">
          <EditableTextCell
            id={info.row.original.id}
            field="source"
            value={info.getValue()}
            isPending={pendingId === info.row.original.id}
            onUpdate={onTextUpdate}
          />
        </div>
      ),
      meta: { minWidth: 120 },
    }),
    col.accessor('cvLink', {
      id: 'cvLink',
      header: 'CV Link',
      cell: (info) => {
        const link = info.getValue() as string | null;
        if (readOnly) {
          return link
            ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block max-w-30">{link}</a>
            : <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex items-center gap-1 w-full">
            <EditableTextCell
              id={info.row.original.id}
              field="cvLink"
              value={link}
              isPending={pendingId === info.row.original.id}
              onUpdate={onTextUpdate}
              placeholder="Add CV link…"
            />
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-blue-500 hover:text-blue-700"
                title="Open CV"
                onClick={(e) => e.stopPropagation()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            )}
          </div>
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
        <TruncatedText value={info.getValue() as string | null} />
      ) : (
        <div className="flex justify-center w-full max-w-50 mx-auto">
          <EditableTextCell
            id={info.row.original.id}
            field="notes"
            value={info.getValue()}
            isPending={pendingId === info.row.original.id}
            multiline
            truncate
            placeholder="Add note…"
            onUpdate={onTextUpdate}
          />
        </div>
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

// Helpers 

// Builds the group-header colspan map: { groupLabel → colSpan }
function buildGroupSpans(allColumnIds: string[]): { label: string; span: number; tone: BandTone }[] {
  return COLUMN_GROUPS.map((g) => ({
    label: g.label,
    span: g.columnIds.filter((id) => allColumnIds.includes(id)).length,
    tone: g.tone,
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
      className="w-max min-w-full table-fixed border-separate border-spacing-0"
      containerClassName={TABLE_CONTAINER_CLASS}
    >
      <TableHeader className="sticky top-0 z-40 bg-card">
        {/* Column group band */}
          <TableRow className="border-b-0">
            {/* Frozen header spacer: spans the sticky columns */}
            <TableHead
              colSpan={1}
              className="sticky left-0 z-30 border-r border-b border-border bg-card text-xs font-semibold"
            >
              {/* Empty: sits above Full Name */}
            </TableHead>
            {/* Group headers */}
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
                    className={`whitespace-nowrap text-center align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-r border-b border-border last:border-r-0 ${
                      isSticky ? 'bg-muted' : 'bg-muted'
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
                  <TableCell key={ci} className="border-r border-border last:border-r-0 py-2">
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
                className="hover:bg-muted/60 transition-colors group"
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
                          ? 'bg-card group-hover:bg-[color-mix(in_srgb,var(--muted)_60%,var(--card))] transition-colors shadow-[1px_0_0_0_var(--border)]'
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

          {/* Empty state — hover suppressed: "no results" is not a row you
              can act on, so it should not light up under the cursor. */}
          {!isLoading && eps.length === 0 && (
            <TableRow className="hover:bg-transparent border-b-0">
              <TableCell
                colSpan={columns.length}
                className="h-40 text-center text-muted-foreground text-sm"
              >
                No EPs found. Try adjusting your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
    </Table>
  );
}
