// Desktop data grid for the Leads & Sign-ups page
// Read-only columns: Full Name, EP ID, Status, Email, Phone, University, Programme, Source, Created Date.
// When canDispatch = true: first column is a checkbox for bulk selection

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

function buildColumns(
  canDispatch: boolean,
  selectedIds: string[],
  onSelectionChange: (ids: string[]) => void,
  allIds: string[],
): ColumnDef<Lead, any>[] {
  const selectedSet = new Set(selectedIds);

  const checkboxCol = col.display({
    id: 'select',
    header: () => {
      const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
      const someSelected = allIds.some((id) => selectedSet.has(id));
      return (
        <div className="flex justify-center">
          <Checkbox
            checked={allSelected}
            // indeterminate state when only some rows are selected
            data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
            onCheckedChange={(checked) => {
              onSelectionChange(checked ? allIds : []);
            }}
            aria-label="Select all"
          />
        </div>
      );
    },
    cell: (info) => {
      const id = info.row.original.id;
      return (
        <div className="flex justify-center">
          <Checkbox
            checked={selectedSet.has(id)}
            onCheckedChange={(checked) => {
              onSelectionChange(
                checked
                  ? [...selectedIds, id]
                  : selectedIds.filter((s) => s !== id),
              );
            }}
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
    col.accessor('id', {
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
      cell: (info) => <DateCell value={info.getValue()} />,
      meta: { minWidth: 100 },
    }),
  ];

  return canDispatch ? [checkboxCol, ...dataCols] : dataCols;
}

export function LeadTable({
  leads,
  isLoading,
  canDispatch,
  selectedIds,
  onSelectionChange,
}: LeadTableProps) {
  const allIds = useMemo(() => leads.map((l) => l.id), [leads]);

  const columns = useMemo(
    () => buildColumns(canDispatch, selectedIds, onSelectionChange, allIds),
    // rebuild whenever selection or data changes so checkbox state stays accurate
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canDispatch, selectedIds, allIds],
  );

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const leafColumns = table.getAllLeafColumns();
  const stickyOffsets: Record<string, number> = {};
  let cumulativeLeft = 0;
  for (const c of leafColumns) {
    const meta = (c.columnDef.meta ?? {}) as { sticky?: string; minWidth?: number };
    if (meta.sticky !== 'left') break;
    stickyOffsets[c.id] = cumulativeLeft;
    cumulativeLeft += meta.minWidth ?? 90;
  }

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
            <TableRow
              key={row.id}
              className="hover:bg-muted/60 transition-colors group"
              data-selected={selectedIds.includes(row.original.id) || undefined}
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
                        ? { position: 'sticky', left: stickyOffsets[cell.column.id] ?? 0, zIndex: 10 }
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