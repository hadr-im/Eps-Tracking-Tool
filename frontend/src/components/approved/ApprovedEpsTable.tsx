import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import {
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  UserPlus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadgeCell } from "@/components/crm/cells/StatusBadgeCell";
import { DateCell } from "@/components/crm/cells/DateCell";
import { TruncatedText } from "@/components/crm/cells/TruncatedText";
import { initialsFor } from "@/components/layout/UserAvatar";
import type { DepartmentMember } from "@/services/departmentService";
import type { ApprovedEp } from "@/types/approvedEp";
import type { EpStatus } from "@/types/ep";
import { BAND_CLASS, bandStyle, type BandTone, TABLE_CONTAINER_CLASS } from "@/components/ui/data-table";

// Compact member select for table cells

function MemberSelectCell({
  members,
  selectedId,
  onSelect,
  disabled,
}: {
  members: DepartmentMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const selected = selectedId ? members.find((m) => m.id === selectedId) : null;

  return (
    <Select
      value={selectedId ?? ''}
      onValueChange={(val) => val && onSelect(val)}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-7 w-auto min-w-32 max-w-48 border rounded-lg px-2 gap-1.5 bg-transparent focus:ring-1 focus:ring-aiesec-blue/30 disabled:opacity-50"
      >
        {selected ? (
          <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aiesec-blue/10 text-aiesec-blue font-semibold text-[9px]">
              {initialsFor(selected.fullName)}
            </span>
            <span className="truncate text-xs font-medium text-foreground">
              {selected.fullName}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground flex-1">
            <UserPlus size={12} strokeWidth={1.8} />
            <span className="text-xs">Assign</span>
          </div>
        )}
      </SelectTrigger>
      <SelectContent className="w-auto! min-w-40">
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id} label={m.fullName}>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aiesec-blue/10 text-aiesec-blue font-semibold text-[9px]">
                {initialsFor(m.fullName)}
              </span>
              <span className="text-sm">{m.fullName}</span>
            </div>
          </SelectItem>
        ))}
        {members.length === 0 && (
          <div className="px-3 py-3 text-xs text-muted-foreground text-center">
            No members found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

// Column group metadata

interface ColumnGroup {
  label: string;
  tone: BandTone;
  columnIds: string[];
}

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: "Identity",
    tone: 1 as BandTone,
    columnIds: ["statusOnExpa", "createdAtExpa", "id", "phone"],
  },
  {
    label: "Opportunity",
    tone: 2 as BandTone,
    columnIds: ["appId", "opportunityTitle", "product", "duration"],
  },
  {
    label: "Hosting",
    tone: 3 as BandTone,
    columnIds: ["hostingMC", "hostingLC"],
  },
  {
    label: "Timeline",
    tone: 4 as BandTone,
    columnIds: ["approvalDate", "reaDate", "finishedDate", "completedDate"],
  },
  {
    label: "Financials & Docs",
    tone: 5 as BandTone,
    columnIds: ["projectFees", "contractLink", "auditFolder"],
  },
  {
    label: "Actions",
    tone: 5 as BandTone,
    columnIds: ["comments"],
  },
];

// Props

interface ApprovedEpsTableProps {
  eps: ApprovedEp[];
  isLoading: boolean;
  onCommentClick?: (ep: ApprovedEp) => void;
  commentCounts?: Record<string, number>;
  // TL / VP only — when present, the Member column renders a picker
  // scoped to the department instead of a static name.
  departmentMembers?: DepartmentMember[];
  onReassign?: (epId: string, memberId: string) => void;
  reassigningId?: string | null;
}

const STICKY_OFFSET: Record<string, number> = {
  fullName: 0,
  memberName: 180,
};

// Helpers

function ExternalLinkCell({
  href,
  label,
}: {
  href: string | null;
  label?: string;
}) {
  if (!href) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-30"
      title={href}
    >
      {label ?? href}
      <ExternalLink size={10} className="shrink-0" />
    </a>
  );
}

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (!isSorted)
    return (
      <ArrowUpDown
        size={11}
        className="text-muted-foreground/50 ml-1 shrink-0"
      />
    );
  if (isSorted === "asc")
    return <ArrowUp size={11} className="ml-1 shrink-0" />;
  return <ArrowDown size={11} className="ml-1 shrink-0" />;
}

// Column definitions

const col = createColumnHelper<ApprovedEp>();

function buildColumns(
  onCommentClick?: (ep: ApprovedEp) => void,
  commentCounts: Record<string, number> = {},
  departmentMembers?: DepartmentMember[],
  onReassign?: (epId: string, memberId: string) => void,
  reassigningId?: string | null,
): ColumnDef<ApprovedEp, any>[] {
  return [
    // EP Name
    col.accessor("fullName", {
      id: "fullName",
      header: () => <div className="text-center w-full">Full Name</div>,
      cell: (info) => (
        <span className="font-medium text-sm whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
      meta: { sticky: "left", stickyOffset: 0, minWidth: 180 },
    }),

    // Member — picker for TL/VP, plain text otherwise
    col.accessor("memberName", {
      id: "memberName",
      header: () => <div className="text-center w-full">Member</div>,
      cell: (info) => {
        const ep = info.row.original;
        if (departmentMembers && onReassign) {
          return (
            <MemberSelectCell
              members={departmentMembers}
              selectedId={ep.ownerId ?? null}
              onSelect={(memberId) => onReassign(ep.id, memberId)}
              disabled={reassigningId === ep.id}
            />
          );
        }
        return (
          <span className="text-xs whitespace-nowrap">
            {info.getValue() ?? <span className="text-muted-foreground">—</span>}
          </span>
        );
      },
      enableSorting: true,
      meta: { sticky: "left", stickyOffset: 180, minWidth: 160 },
    }),

    // Identity
    col.accessor("statusOnExpa", {
      id: "statusOnExpa",
      header: () => <div className="text-center w-full">Status</div>,
      cell: (info) => (
        <div className="flex justify-center">
          <StatusBadgeCell status={info.getValue() as EpStatus} />
        </div>
      ),
      enableSorting: true,
      meta: { minWidth: 110 },
    }),
    col.accessor("createdAtExpa", {
      id: "createdAtExpa",
      header: "Created",
      cell: (info) => <DateCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 100 },
    }),
    col.accessor("id", {
      id: "id",
      header: "EP ID",
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">
          {info.getValue()}
        </span>
      ),
      enableSorting: false,
      meta: { minWidth: 90 },
    }),
    col.accessor("phone", {
      id: "phone",
      header: "Phone",
      cell: (info) => (
        <span className="text-xs whitespace-nowrap">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      enableSorting: false,
      meta: { minWidth: 120 },
    }),

    // Opportunity
    col.accessor((row) => row.approvedDetail?.expaAppId ?? null, {
      id: "appId",
      header: "APP ID",
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      enableSorting: false,
      meta: { minWidth: 90 },
    }),
    col.accessor((row) => row.approvedDetail?.opportunityTitle ?? null, {
      id: "opportunityTitle",
      header: "Opportunity",
      cell: (info) => (
        <TruncatedText
          value={info.getValue() as string | null}
          className="text-xs max-w-45 block truncate whitespace-nowrap overflow-hidden"
        />
      ),
      enableSorting: true,
      meta: { minWidth: 200 },
    }),
    col.accessor("product", {
      id: "product",
      header: "Product",
      cell: (info) => (
        <span className="text-xs font-medium">{info.getValue()}</span>
      ),
      enableSorting: true,
      meta: { minWidth: 80 },
    }),

    // Hosting
    col.accessor((row) => row.approvedDetail?.hostingMC ?? null, {
      id: "hostingMC",
      header: "Hosting MC",
      cell: (info) => (
        <span className="text-xs whitespace-nowrap">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      enableSorting: true,
      meta: { minWidth: 120 },
    }),
    col.accessor((row) => row.approvedDetail?.hostingLC ?? null, {
      id: "hostingLC",
      header: "Hosting LC",
      cell: (info) => (
        <span className="text-xs whitespace-nowrap">
          {info.getValue() ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      enableSorting: true,
      meta: { minWidth: 120 },
    }),

    // Timeline
    col.accessor((row) => row.approvedDetail?.approvalDate ?? null, {
      id: "approvalDate",
      header: "Approval Date",
      cell: (info) => <DateCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 120 },
    }),
    col.accessor((row) => row.approvedDetail?.realizedDate ?? null, {
      id: "reaDate",
      header: "REA Date",
      cell: (info) => <DateCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 110 },
    }),
    col.accessor((row) => row.approvedDetail?.finishedDate ?? null, {
      id: "finishedDate",
      header: "Finish Date",
      cell: (info) => <DateCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 110 },
    }),
    col.accessor((row) => row.approvedDetail?.completedDate ?? null, {
      id: "completedDate",
      header: "Completed",
      cell: (info) => <DateCell value={info.getValue()} />,
      enableSorting: true,
      meta: { minWidth: 110 },
    }),

    // Financials & Docs
    col.accessor((row) => row.approvedDetail?.projectFees ?? null, {
      id: "projectFees",
      header: "Project Fees",
      cell: (info) => {
        const v = info.getValue() as number | null;
        if (v == null)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="text-xs tabular-nums">{v.toLocaleString()}</span>
        );
      },
      enableSorting: true,
      meta: { minWidth: 110 },
    }),
    col.accessor((row) => row.approvedDetail?.contractLink ?? null, {
      id: "contractLink",
      header: "Contract",
      cell: (info) => (
        <ExternalLinkCell href={info.getValue()} label="Contract" />
      ),
      enableSorting: false,
      meta: { minWidth: 110 },
    }),
    col.accessor((row) => row.approvedDetail?.auditFolder ?? null, {
      id: "auditFolder",
      header: "Audit Folder",
      cell: (info) => <ExternalLinkCell href={info.getValue()} label="Audit" />,
      enableSorting: false,
      meta: { minWidth: 110 },
    }),

    // Comments
    ...(onCommentClick
      ? [
          col.display({
            id: "comments",
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
                      {count > 9 ? "9+" : count}
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

// Build group-header colspan map

function buildGroupSpans(allColumnIds: string[]) {
  return COLUMN_GROUPS.map((g) => ({
    label: g.label,
    span: g.columnIds.filter((id) => allColumnIds.includes(id)).length,
    tone: g.tone,
  })).filter((g) => g.span > 0);
}

// Component

export function ApprovedEpsTable({
  eps,
  isLoading,
  onCommentClick,
  commentCounts = {},
  departmentMembers,
  onReassign,
  reassigningId,
}: ApprovedEpsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => buildColumns(onCommentClick, commentCounts, departmentMembers, onReassign, reassigningId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCommentClick, commentCounts, departmentMembers, onReassign, reassigningId],
  );

  const table = useReactTable({
    data: eps,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const allIds = table.getAllLeafColumns().map((c) => c.id);
  const groupSpans = buildGroupSpans(allIds);

  return (
    <Table
      className="w-max min-w-full table-fixed border-separate border-spacing-0"
      containerClassName={TABLE_CONTAINER_CLASS}
    >
      <TableHeader className="sticky top-0 z-40 bg-card">
        {/* Group band */}
        <TableRow className="border-b-0">
          {/* Spacer spans the two sticky columns (fullName + memberName) */}
          <TableHead
            colSpan={2}
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
              const canSort = header.column.getCanSort();
              const sorted = header.column.getIsSorted();

              return (
                <TableHead
                  key={header.id}
                  style={{
                    minWidth: meta.minWidth ?? 90,
                    width: meta.minWidth ?? 90,
                    ...(isSticky
                      ? {
                          position: "sticky",
                          left: STICKY_OFFSET[header.id] ?? 0,
                          zIndex: 20,
                        }
                      : {}),
                  }}
                  className={`whitespace-nowrap text-center align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-r border-b border-border last:border-r-0 ${
                    isSticky ? "bg-muted" : "bg-muted"
                  } ${canSort ? "cursor-pointer select-none" : ""}`}
                  onClick={
                    canSort
                      ? header.column.getToggleSortingHandler()
                      : undefined
                  }
                >
                  <div className="inline-flex items-center justify-center gap-0.5">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
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
          Array.from({ length: 8 }).map((_, i) => (
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
                            left: STICKY_OFFSET[cell.column.id] ?? 0,
                            zIndex: 10,
                          }
                        : {}),
                    }}
                    className={`border-r border-border last:border-r-0 py-2 text-center align-middle ${
                      isSticky ? "bg-card group-hover:bg-[color-mix(in_srgb,var(--muted)_60%,var(--card))] transition-colors" : ""
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
        {!isLoading && eps.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-40 text-center text-muted-foreground text-sm"
            >
              No approved EPs found. Try adjusting your filters.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
