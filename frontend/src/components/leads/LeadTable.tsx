// Desktop data grid for the Leads & Sign-ups page
// Read-only columns: Full Name, EP ID, Status, Email, Phone, University, Programme, Source, Created Date.
// When canDispatch = true: first column is a checkbox for bulk selection

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { memo, useMemo, useRef, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton }  from '@/components/ui/skeleton';
import { Checkbox }  from '@/components/ui/checkbox';
import { DateCell }  from '@/components/crm/cells/DateCell';
import type { Lead } from '@/types/lead';
import { TABLE_CONTAINER_CLASS } from "@/components/ui/data-table";
import { StatusBadgeCell } from '@/components/crm/cells/StatusBadgeCell';
import { TruncatedText }  from '@/components/crm/cells/TruncatedText';
import type { EpStatus } from '@/types/ep';


interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  canDispatch: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const col = createColumnHelper<Lead>();

/*
  Selection lives in the table's `meta` rather than being captured by the
  column closures.

  Closing over it meant every tick rebuilt all 14 column definitions, which
  makes TanStack throw away and rebuild its whole column model and re-render
  every row — around 5,600 cells on a 400-lead department, hence the delay
  before a checkbox appeared ticked. `meta` is read at render time, so the
  columns can stay referentially stable for the life of the table.
*/
/*
  The handlers are deliberately not derived from `selectedSet`.

  Rows are memoised, so a row the user has not touched does not re-render when
  the selection changes — and its cells keep the `selectedSet` captured the
  last time they did render. Computing the next selection from that set means
  ticking a second lead starts from a stale snapshot and drops the first one,
  which read as "multi-select is broken". The toggles therefore close over a
  ref that is always current, and only the `checked` flag reads the set — that
  one is safe, because a row re-renders exactly when its own selection flips.
*/
interface LeadTableMeta {
  selectedSet: Set<string>;
  allIds: string[];
  toggleOne: (id: string, checked: boolean) => void;
  togglePage: (checked: boolean) => void;
}

function metaOf(table: { options: { meta?: unknown } }): LeadTableMeta {
  return table.options.meta as LeadTableMeta;
}

function buildColumns(canDispatch: boolean): ColumnDef<Lead, any>[] {
  const checkboxCol = col.display({
    id: 'select',
    header: ({ table }) => {
      const { selectedSet, allIds, togglePage } = metaOf(table);
      const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
      const someSelected = allIds.some((id) => selectedSet.has(id));
      return (
        <div className="flex justify-center">
          <Checkbox
            checked={allSelected}
            // indeterminate state when only some rows are selected
            data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
            onCheckedChange={(checked) => togglePage(Boolean(checked))}
            aria-label="Select all on this page"
          />
        </div>
      );
    },
    cell: (info) => {
      const id = info.row.original.id;
      const { selectedSet, toggleOne } = metaOf(info.table);
      return (
        <div className="flex justify-center">
          <Checkbox
            checked={selectedSet.has(id)}
            onCheckedChange={(checked) => toggleOne(id, Boolean(checked))}
            aria-label={`Select ${info.row.original.fullName}`}
          />
        </div>
      );
    },
    meta: { sticky: 'left', minWidth: 44 },
  });

  const dataCols: ColumnDef<Lead, any>[] = [
    col.accessor('fullName', {
      id: 'fullName',
      header: 'Full Name',
      cell: (info) => (
        <span className="font-medium text-sm whitespace-nowrap">{info.getValue()}</span>
      ),
      meta: { sticky: 'left', minWidth: 160 },
    }),
    col.accessor('expaId', {
      id: 'id',
      header: 'EP ID',
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
      ),
      meta: { minWidth: 80 },
    }),
    col.accessor('statusOnExpa', {
      id: 'statusOnExpa',
      header: 'Status',
      cell: (info) => (
        <StatusBadgeCell status={info.getValue() as EpStatus} />
      ),
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
      meta: { minWidth: 140 },
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
      cell: (info) => {
        const year = info.getValue();
        return year === null ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <span className="text-xs tabular-nums">{year}</span>
        );
      },
      meta: { minWidth: 60 },
    }),
    col.accessor('product', {
      id: 'product',
      header: 'Product',
      cell: (info) => (
        <span className="text-xs font-mono">{info.getValue()}</span>
      ),
      meta: { minWidth: 90 },
    }),
    col.accessor('source', {
      id: 'source',
      header: 'Source',
      cell: (info) => (
        <TruncatedText
          value={info.getValue()}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden"
        />
      ),
      meta: { minWidth: 100 },
    }),
    col.accessor('createdAtExpa', {
      id: 'createdAtExpa',
      header: 'Created',
      // With time: sign-ups arrive in bursts during a campaign, so the day
      // alone does not tell you which of twenty leads came in first.
      cell: (info) => <DateCell value={info.getValue()} withTime />,
      meta: { minWidth: 140 },
    }),
  ];

  return canDispatch ? [checkboxCol, ...dataCols] : dataCols;
}

/*
  Memoised so ticking one checkbox re-renders one row instead of all of them.

  `row` objects come from TanStack's memoised row model and keep their identity
  while data and columns are unchanged, and `stickyOffsets` is memoised below,
  so `isSelected` is the only prop that moves — which is exactly the row the
  user clicked.
*/
const LeadRow = memo(function LeadRow({
  row,
  isSelected,
  stickyOffsets,
}: {
  row: Row<Lead>;
  isSelected: boolean;
  stickyOffsets: Record<string, number>;
}) {
  return (
    <TableRow
      className="hover:bg-muted/60 transition-colors group"
      data-selected={isSelected || undefined}
    >
      {row.getVisibleCells().map((cell) => {
        const meta = (cell.column.columnDef.meta ?? {}) as {
          sticky?: string;
          minWidth?: number;
        };
        const isSticky = meta.sticky === 'left';
        return (
          <TableCell
            key={cell.id}
            style={{
              minWidth: meta.minWidth ?? 90,
              width: meta.minWidth ?? 90,
              ...(isSticky
                ? { position: 'sticky', left: stickyOffsets[cell.column.id] ?? 0, zIndex: 10 }
                : {}),
            }}
            className={`border-r border-border last:border-r-0 py-2 text-center align-middle ${
              isSticky
                ? 'bg-card group-hover:bg-[color-mix(in_srgb,var(--muted)_60%,var(--card))] transition-colors'
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
  );
});

export function LeadTable({
  leads,
  isLoading,
  canDispatch,
  selectedIds,
  onSelectionChange,
}: LeadTableProps) {
  const allIds = useMemo(() => leads.map((l) => l.id), [leads]);

  // Membership is checked once per row on every render; an array would make
  // that O(n²) — about 165,000 comparisons on a 400-lead department.
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Only `canDispatch` can change the shape of the table, so the columns are
  // built once and survive every selection change. See LeadTableMeta.
  const columns = useMemo(() => buildColumns(canDispatch), [canDispatch]);

  /*
    Always-current mirrors of the selection and this page's ids. A memoised row
    holds whatever meta existed when it last rendered, so the toggles read
    through these rather than through whatever they happened to close over.
  */
  const selectedRef = useRef(selectedIds);
  selectedRef.current = selectedIds;

  const allIdsRef = useRef(allIds);
  allIdsRef.current = allIds;

  const toggleOne = useCallback(
    (id: string, checked: boolean) => {
      const next = new Set(selectedRef.current);
      if (checked) next.add(id);
      else next.delete(id);
      onSelectionChange([...next]);
    },
    [onSelectionChange],
  );

  /*
    Scoped to this page. Selection survives paging, so clearing the whole list
    here would silently discard rows ticked on a page the user has already
    left — this adds or removes only what is on screen.
  */
  const togglePage = useCallback(
    (checked: boolean) => {
      const next = new Set(selectedRef.current);
      for (const id of allIdsRef.current) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      onSelectionChange([...next]);
    },
    [onSelectionChange],
  );

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { selectedSet, allIds, toggleOne, togglePage } satisfies LeadTableMeta,
  });

  // Memoised so its identity is stable, which is what lets LeadRow skip
  // re-rendering. It only depends on the column shape, never on selection.
  const stickyOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let cumulativeLeft = 0;
    for (const c of table.getAllLeafColumns()) {
      const meta = (c.columnDef.meta ?? {}) as { sticky?: string; minWidth?: number };
      if (meta.sticky !== 'left') break;
      offsets[c.id] = cumulativeLeft;
      cumulativeLeft += meta.minWidth ?? 90;
    }
    return offsets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  return (
    <Table
      className="w-max min-w-full table-fixed border-separate border-spacing-0"
      containerClassName={TABLE_CONTAINER_CLASS}
    >
      <TableHeader className="sticky top-0 z-20 bg-card">
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
                      ? { position: 'sticky', left: stickyOffsets[header.id] ?? 0, zIndex: 20 }
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
            <LeadRow
              key={row.id}
              row={row}
              isSelected={selectedSet.has(row.original.id)}
              stickyOffsets={stickyOffsets}
            />
          ))}

        {/* Empty state */}
        {!isLoading && leads.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-40 text-center text-muted-foreground text-sm"
            >
              No leads found. Try adjusting your filters.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}