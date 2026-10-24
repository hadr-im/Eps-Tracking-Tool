import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadgeCell } from "@/components/crm/cells/StatusBadgeCell";
import { DateCell } from "@/components/crm/cells/DateCell";
import { TruncatedText } from "@/components/crm/cells/TruncatedText";
import { Checkbox } from "@/components/ui/checkbox";
import type { TransitionHistoryDto } from "@/types/ep";
import { BAND_CLASS, bandStyle, type BandTone, TABLE_CONTAINER_CLASS } from "@/components/ui/data-table";

// Column group metadata
interface ColumnGroup {
  label: string;
  tone: BandTone;
  columnIds: string[];
}

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: "General Info",
    tone: 1 as BandTone,
    columnIds: [
      "statusOnExpa",
      "epId",
      "createdAtExpa",
      "email",
      "phone",
      "university",
      "fieldOfStudy",
      "yearOfStudy",
    ],
  },
  /*
    Only the CRM fields that still mean something once an EP has moved
    department. Phase, notes, contacted and the rest describe work done by the
    team that handed them over, which the receiving team does not inherit.
  */
  {
    label: "CRM",
    tone: 2 as BandTone,
    columnIds: ["source"],
  },
  {
    label: "Interests",
    tone: 3 as BandTone,
    columnIds: ["availability"],
  },
  {
    label: "Transition",
    tone: 4 as BandTone,
    columnIds: ["fromProduct", "createdAt", "triggeredByName", "note"],
  },
];

interface TransitionedEpsTableProps {
  transitions: TransitionHistoryDto[];
  isLoading: boolean;
  /** Shows the selection checkboxes. Team Leaders and VPs only. */
  canDispatch?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

/*
  Selection is read from the table's `meta` rather than captured by the column
  closures, so ticking a box does not rebuild every column definition. Same
  reasoning as LeadTable — see the note there.
*/
interface TransitionsTableMeta {
  selectedSet: Set<string>;
  selectableIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function metaOf(table: { options: { meta?: unknown } }): TransitionsTableMeta {
  return table.options.meta as TransitionsTableMeta;
}

const col = createColumnHelper<TransitionHistoryDto>();

function buildColumns(canDispatch: boolean): ColumnDef<TransitionHistoryDto, any>[] {
  const checkboxCol = col.display({
    id: "select",
    header: ({ table }) => {
      const { selectedSet, selectableIds, onSelectionChange } = metaOf(table);
      const allSelected =
        selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id));
      const someSelected = selectableIds.some((id) => selectedSet.has(id));
      return (
        <div className="flex justify-center">
          <Checkbox
            checked={allSelected}
            data-state={someSelected && !allSelected ? "indeterminate" : undefined}
            onCheckedChange={(checked) => onSelectionChange(checked ? selectableIds : [])}
            className="border-2 border-foreground/40"
            aria-label="Select all"
          />
        </div>
      );
    },
    cell: (info) => {
      const ep = info.row.original.ep;
      const { selectedSet, onSelectionChange } = metaOf(info.table);

      // An EP already assigned to a member is not in the pool to dispatch.
      if (!ep || ep.ownerId) return null;

      return (
        <div className="flex justify-center">
          <Checkbox
            checked={selectedSet.has(ep.id)}
            onCheckedChange={(checked) => {
              const next = new Set(selectedSet);
              if (checked) next.add(ep.id);
              else next.delete(ep.id);
              onSelectionChange([...next]);
            }}
            className="border-2 border-foreground/40"
            aria-label={`Select ${ep.fullName}`}
          />
        </div>
      );
    },
    meta: { sticky: "left", minWidth: 44 },
  });

  const dataCols: ColumnDef<TransitionHistoryDto, any>[] = [

    col.accessor((row) => row.ep?.fullName ?? "Unknown", {
      id: "fullName",
      header: () => <div className="text-center w-full">Full Name</div>,
      cell: (info) => (
        <span className="font-medium text-sm whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
      meta: { sticky: "left", minWidth: 160 },
    }),

    // General Info
    col.accessor((row) => row.ep?.statusOnExpa ?? "LEAD", {
      id: "statusOnExpa",
      header: () => <div className="text-center w-full">Status</div>,
      cell: (info) => (
        <div className="flex justify-center">
          <StatusBadgeCell status={info.getValue() as any} />
        </div>
      ),
      meta: { minWidth: 100 },
    }),
    col.accessor((row) => row.ep?.id ?? "", {
      id: "epId",
      header: "EP ID",
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">
          {info.getValue()}
        </span>
      ),
      meta: { minWidth: 80 },
    }),
    col.accessor((row) => row.ep?.createdAtExpa ?? "", {
      id: "createdAtExpa",
      header: "Created",
      cell: (info) => <DateCell value={info.getValue()} />,
      meta: { minWidth: 100 },
    }),
    col.accessor((row) => row.ep?.email ?? null, {
      id: "email",
      header: "Email",
      cell: (info) => (
        <TruncatedText
          value={info.getValue() as string | null}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden mx-auto"
        />
      ),
      meta: { minWidth: 160 },
    }),
    col.accessor((row) => row.ep?.phone ?? null, {
      id: "phone",
      header: "Phone",
      cell: (info) => (
        <span className="text-xs whitespace-nowrap mx-auto">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 110 },
    }),
    col.accessor((row) => row.ep?.university ?? null, {
      id: "university",
      header: "University",
      cell: (info) => (
        <TruncatedText
          value={info.getValue() as string | null}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden mx-auto"
        />
      ),
      meta: { minWidth: 130 },
    }),
    col.accessor((row) => row.ep?.fieldOfStudy ?? null, {
      id: "fieldOfStudy",
      header: "Field of Study",
      cell: (info) => (
        <TruncatedText
          value={info.getValue() as string | null}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden mx-auto"
        />
      ),
      meta: { minWidth: 130 },
    }),
    col.accessor((row) => row.ep?.yearOfStudy ?? null, {
      id: "yearOfStudy",
      header: "Year",
      cell: (info) => (
        <span className="text-xs">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 60 },
    }),

    // CRM
    col.accessor((row) => row.ep?.source ?? null, {
      id: "source",
      header: "Source",
      cell: (info) => (
        <TruncatedText
          value={info.getValue() as string | null}
          className="text-xs max-w-40 block truncate whitespace-nowrap overflow-hidden mx-auto"
        />
      ),
      meta: { minWidth: 120 },
    }),
    // Interests
    col.accessor((row) => row.ep?.availability ?? null, {
      id: "availability",
      header: "Availability",
      cell: (info) => {
        const v = info.getValue() as string | null;
        if (!v) return <span className="text-muted-foreground text-xs">—</span>;
        const label = v
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
        return <span className="text-xs whitespace-nowrap">{label}</span>;
      },
      meta: { minWidth: 150 },
    }),

    // Transition Details
    col.display({
      id: "fromProduct",
      header: "Transition",
      cell: (info) => {
        const t = info.row.original;
        return (
          <div className="flex items-center justify-center gap-2 text-xs w-full h-full">
            <span className="text-muted-foreground">
              {t.fromProduct ?? "—"}
            </span>
            <ArrowRight size={14} className="text-muted-foreground" />
            <span className="text-foreground">{t.toProduct ?? "—"}</span>
          </div>
        );
      },
      meta: { minWidth: 100 },
    }),
    col.accessor("createdAt", {
      id: "createdAt",
      header: "Date",
      cell: (info) => <DateCell value={info.getValue()} />,
      meta: { minWidth: 130 },
    }),
    col.accessor("triggeredByName", {
      id: "triggeredByName",
      header: "Triggered By",
      cell: (info) => (
        <span className="text-xs text-muted-foreground">{info.getValue()}</span>
      ),
      meta: { minWidth: 140 },
    }),
    col.accessor("note", {
      id: "note",
      header: "Transition Note",
      cell: (info) => (
        <TruncatedText
          value={(info.getValue() as string | null) || null}
          className="text-xs text-muted-foreground max-w-62.5 mx-auto text-left block truncate whitespace-nowrap overflow-hidden"
        />
      ),
      meta: { minWidth: 200 },
    }),
  ];

  return canDispatch ? [checkboxCol, ...dataCols] : dataCols;
}

// Helpers
function buildGroupSpans(
  allColumnIds: string[],
): { label: string; span: number; tone: BandTone }[] {
  return COLUMN_GROUPS.map((g) => ({
    label: g.label,
    span: g.columnIds.filter((id) => allColumnIds.includes(id)).length,
    tone: g.tone,
  })).filter((g) => g.span > 0);
}

export function TransitionedEpsTable({
  transitions,
  isLoading,
  canDispatch = false,
  selectedIds = [],
  onSelectionChange,
}: TransitionedEpsTableProps) {
  const columns = useMemo(() => buildColumns(canDispatch), [canDispatch]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Only unassigned EPs can be dispatched, so "select all" means those.
  const selectableIds = useMemo(
    () =>
      transitions
        .map((t) => t.ep)
        .filter((ep): ep is NonNullable<typeof ep> => !!ep && !ep.ownerId)
        .map((ep) => ep.id),
    [transitions],
  );

  const table = useReactTable({
    data: transitions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      selectedSet,
      selectableIds,
      onSelectionChange: onSelectionChange ?? (() => {}),
    } satisfies TransitionsTableMeta,
  });

  const allIds = table.getAllLeafColumns().map((c) => c.id);
  const groupSpans = buildGroupSpans(allIds);

  const leafColumns = table.getAllLeafColumns();
  const stickyOffsets: Record<string, number> = {};
  let cumulativeLeft = 0;
  let stickyCount = 0;
  for (const c of leafColumns) {
    const meta = (c.columnDef.meta ?? {}) as {
      sticky?: string;
      minWidth?: number;
    };
    if (meta.sticky !== "left") break;
    stickyOffsets[c.id] = cumulativeLeft;
    cumulativeLeft += meta.minWidth ?? 90;
    stickyCount += 1;
  }

  return (
    <Table
      className="w-max min-w-full table-fixed border-separate border-spacing-0"
      containerClassName={TABLE_CONTAINER_CLASS}
    >
      <TableHeader className="sticky top-0 z-40 bg-card">
        {/* Column group band */}
        <TableRow className="border-b-0">
          <TableHead
            colSpan={stickyCount}
            className="sticky left-0 z-30 border-r border-b border-border bg-card text-xs font-semibold"
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
              const meta = header.column.columnDef.meta ?? {};
              const isSticky = meta.sticky === "left";

              return (
                <TableHead
                  key={header.id}
                  style={{
                    minWidth: meta.minWidth ?? 90,
                    width: meta.minWidth ?? 90,
                    ...(isSticky
                      ? {
                          position: "sticky",
                          left: stickyOffsets[header.id] ?? 0,
                          zIndex: 20,
                        }
                      : {}),
                  }}
                  className={`whitespace-nowrap text-center align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-r border-b border-border last:border-r-0 ${
                    isSticky ? "bg-muted" : "bg-muted"
                  }`}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>

      <TableBody>
        {/* Loading skeleton */}
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={`skel-${i}`}>
              {columns.map((_, ci) => (
                <TableCell
                  key={ci}
                  className="border-r border-border last:border-r-0 py-2"
                >
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
                const isSticky = meta.sticky === "left";

                return (
                  <TableCell
                    key={cell.id}
                    style={{
                      minWidth: meta.minWidth ?? 90,
                      width: meta.minWidth ?? 90,
                      ...(isSticky
                        ? {
                            position: "sticky",
                            left: stickyOffsets[cell.column.id] ?? 0,
                            zIndex: 10,
                          }
                        : {}),
                    }}
                    className={`border-r border-border last:border-r-0 py-2 text-center align-middle ${
                      isSticky
                        ? "bg-card group-hover:bg-[color-mix(in_srgb,var(--muted)_60%,var(--card))] transition-colors"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}

        {/* Empty state */}
        {!isLoading && transitions.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-40 text-center text-muted-foreground text-sm"
            >
              No transitioned EPs found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
