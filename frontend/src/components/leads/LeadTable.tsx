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
import { Badge }     from '@/components/ui/badge';
import { Checkbox }  from '@/components/ui/checkbox';
import type { Lead } from '@/types/lead';

// Status badge colours
const STATUS_COLORS: Record<string, string> = {
  LEAD:       'bg-slate-600  text-white border-slate-600',
  CONTACTED:  'bg-blue-500   text-white border-blue-500',
  INTERESTED: 'bg-violet-500 text-white border-violet-500',
};

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
    meta: { minWidth: 44 },
  });

  const dataCols: ColumnDef<Lead, any>[] = [
    col.accessor('fullName', {
      id: 'fullName',
      header: 'Full Name',
      cell: (info) => (
        <span className="font-medium text-sm whitespace-nowrap">{info.getValue()}</span>
      ),
      meta: { minWidth: 160 },
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
      cell: (info) => {
        const s = info.getValue() as string;
        return (
          <Badge
            variant="outline"
            className={`text-xs whitespace-nowrap ${STATUS_COLORS[s] ?? 'bg-muted text-muted-foreground'}`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </Badge>
        );
      },
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
        <span className="text-xs">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
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
        <span className="text-xs">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 100 },
    }),
    col.accessor('createdAtExpa', {
      id: 'createdAtExpa',
      header: 'Created',
      cell: (info) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
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

  return (
    <Table
      className="w-max min-w-full table-fixed"
      containerClassName="relative w-full h-full overflow-auto rounded-xl border bg-card"
    >
      <TableHeader className="sticky top-0 z-20 bg-card">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="bg-muted/40">
            {headerGroup.headers.map((header) => {
              const meta = header.column.columnDef.meta ?? {};
              return (
                <TableHead
                  key={header.id}
                  style={{ minWidth: meta.minWidth ?? 90, width: meta.minWidth ?? 90 }}
                  className="whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r last:border-r-0 bg-muted/40"
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
              className="hover:bg-muted/30 transition-colors"
              data-selected={selectedIds.includes(row.original.id) || undefined}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta ?? {};
                return (
                  <TableCell
                    key={cell.id}
                    style={{ minWidth: meta.minWidth ?? 90, width: meta.minWidth ?? 90 }}
                    className="border-r last:border-r-0 py-2 text-center align-middle"
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


