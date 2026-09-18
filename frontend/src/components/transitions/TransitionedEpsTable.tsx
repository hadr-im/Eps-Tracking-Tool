import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadgeCell } from "@/components/crm/cells/StatusBadgeCell";
import { DateCell } from "@/components/crm/cells/DateCell";
import { MemberPicker } from "@/components/team/MemberPicker";
import type { TransitionHistoryDto } from "@/types/ep";
import type { DepartmentMember } from "@/services/departmentService";

// Column group metadata
interface ColumnGroup {
  label: string;
  headerClass: string;
  columnIds: string[];
}

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: "General Info",
    headerClass: "bg-blue-500 text-white border-blue-500",
    columnIds: [
      "statusOnExpa",
      "epId",
      "product",
      "createdAtExpa",
      "email",
      "phone",
      "university",
      "fieldOfStudy",
      "yearOfStudy",
    ],
  },
  {
    label: "CRM",
    headerClass: "bg-amber-500 text-white border-amber-500",
    columnIds: [
      "memberName",
      "source",
      "cvLink",
      "contacted",
      "interested",
      "trackingPhase",
      "notes",
    ],
  },
  {
    label: "Interests",
    headerClass: "bg-emerald-500 text-white border-emerald-500",
    columnIds: ["duration", "availability"],
  },
  {
    label: "Transition",
    headerClass: "bg-violet-500 text-white border-violet-500",
    columnIds: ["fromProduct", "createdAt", "triggeredByName", "note"],
  },
];

interface TransitionedEpsTableProps {
  transitions: TransitionHistoryDto[];
  isLoading: boolean;
  departmentMembers: DepartmentMember[];
  onAssignEp?: (epId: string, memberId: string) => void;
  isAssigningId?: string | null;
}

const col = createColumnHelper<TransitionHistoryDto>();

function buildColumns(
  departmentMembers: DepartmentMember[],
  onAssignEp?: (epId: string, memberId: string) => void,
  isAssigningId?: string | null,
): ColumnDef<TransitionHistoryDto, any>[] {
  return [

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

    ...(onAssignEp
      ? [
          col.display({
            id: "toWhom",
            header: () => <div className="text-center w-full">To Whom?</div>,
            cell: (info) => {
              const t = info.row.original;
              const isInbound = t.direction === "INBOUND";
              const epId = t.ep?.id;

              if (!isInbound || !epId) {
                return <span className="text-muted-foreground text-xs">—</span>;
              }

              return (
                <div
                  className="flex items-center justify-center w-full px-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MemberPicker
                    members={departmentMembers}
                    selectedId={t.ep?.ownerId ?? null}
                    onSelect={(id) => onAssignEp(epId, id)}
                    placeholder="Assign..."
                    disabled={isAssigningId === epId}
                    variant="outline"
                    className="h-8 w-36 mx-auto text-xs rounded-full"
                  />
                </div>
              );
            },
            meta: { sticky: "left", minWidth: 160 },
          }),
        ]
      : []),

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
        <span className="text-xs truncate max-w-40 block mx-auto">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
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
        <span className="text-xs">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 130 },
    }),
    col.accessor((row) => row.ep?.fieldOfStudy ?? null, {
      id: "fieldOfStudy",
      header: "Field of Study",
      cell: (info) => (
        <span className="text-xs">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
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
    col.accessor("memberName", {
      id: "memberName",
      header: "Member Name",
      cell: (info) => (
        <span className="text-xs whitespace-nowrap">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 120 },
    }),
    col.accessor((row) => row.ep?.source ?? null, {
      id: "source",
      header: "Source",
      cell: (info) => (
        <span className="text-xs">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 120 },
    }),
    col.accessor((row) => row.ep?.cvLink ?? null, {
      id: "cvLink",
      header: "CV Link",
      cell: (info) => {
        const link = info.getValue() as string | null;
        if (link) {
          return (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate block max-w-30 mx-auto"
            >
              {link}
            </a>
          );
        }
        return <span className="text-muted-foreground text-xs">—</span>;
      },
      meta: { minWidth: 120 },
    }),
    col.accessor((row) => row.ep?.contacted ?? false, {
      id: "contacted",
      header: "Contacted",
      cell: (info) => (
        <span
          className={`text-xs font-medium ${info.getValue() ? "text-emerald-600" : "text-muted-foreground"}`}
        >
          {info.getValue() ? "Yes" : "No"}
        </span>
      ),
      meta: { minWidth: 80 },
    }),
    col.accessor((row) => row.ep?.interested ?? false, {
      id: "interested",
      header: "Interested",
      cell: (info) => (
        <span
          className={`text-xs font-medium ${info.getValue() ? "text-emerald-600" : "text-muted-foreground"}`}
        >
          {info.getValue() ? "Yes" : "No"}
        </span>
      ),
      meta: { minWidth: 80 },
    }),
    col.accessor((row) => row.ep?.trackingPhase ?? null, {
      id: "trackingPhase",
      header: "Phase",
      cell: (info) => (
        <span className="text-xs">
          {info.getValue() ? (
            (info.getValue() as string)
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase())
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
      meta: { minWidth: 190 },
    }),
    col.accessor((row) => row.ep?.notes ?? null, {
      id: "notes",
      header: "Notes",
      cell: (info) => (
        <span className="text-xs max-w-50 block whitespace-pre-wrap mx-auto text-left">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 200 },
    }),

    // Interests
    col.accessor((row) => row.ep?.duration ?? null, {
      id: "duration",
      header: "Duration",
      cell: (info) => {
        const v = info.getValue() as string | null;
        if (!v) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="text-xs">
            {v.charAt(0) + v.slice(1).toLowerCase()}
          </span>
        );
      },
      meta: { minWidth: 120 },
    }),
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
    col.accessor((row) => row.ep?.product ?? null, {
      id: "product",
      header: "Product",
      cell: (info) => (
        <span className="text-xs font-semibold">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      meta: { minWidth: 90 },
    }),
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
        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-w-62.5 mx-auto text-left">
          {info.getValue() || "—"}
        </p>
      ),
      meta: { minWidth: 200 },
    }),
  ];
}

// Helpers
function buildGroupSpans(
  allColumnIds: string[],
): { label: string; span: number; headerClass: string }[] {
  return COLUMN_GROUPS.map((g) => ({
    label: g.label,
    span: g.columnIds.filter((id) => allColumnIds.includes(id)).length,
    headerClass: g.headerClass,
  })).filter((g) => g.span > 0);
}

export function TransitionedEpsTable({
  transitions,
  isLoading,
  departmentMembers,
  onAssignEp,
  isAssigningId,
}: TransitionedEpsTableProps) {
  const columns = useMemo(
    () => buildColumns(departmentMembers, onAssignEp, isAssigningId),
    [departmentMembers, onAssignEp, isAssigningId],
  );

  const table = useReactTable({
    data: transitions,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
      containerClassName="relative w-full h-full overflow-auto rounded-xl border bg-card"
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
                  className={`whitespace-nowrap text-center align-middle text-xs font-semibold text-foreground/80 border-r border-b border-border last:border-r-0 ${
                    isSticky ? "bg-background" : "bg-muted/40"
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
              className="hover:bg-muted/30 transition-colors group"
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
                        ? "bg-background group-hover:bg-muted transition-colors"
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
