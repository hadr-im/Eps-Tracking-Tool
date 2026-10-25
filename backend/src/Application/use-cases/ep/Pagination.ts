/*
  Shared pagination shape for the EP listing endpoints.

  Kept separate from EpFilters on purpose: a filter narrows *which* rows match,
  a page decides how much of that result the caller is handed. Mixing them
  means every WHERE builder has to remember to ignore two keys that are not
  conditions, which is the kind of thing that silently returns the wrong rows.
*/

export interface PageRequest {
  // 1-based, matching what the UI shows.
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  // Rows matching the filters across every page, which is what the UI needs to
  // render the page controls. Costs an extra COUNT, issued in the same
  // round-trip as the page itself.
  total: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 50;

/*
  A ceiling rather than a free choice: pageSize arrives from the query string,
  so without one a client could ask for every row and undo the point of this.
*/
export const MAX_PAGE_SIZE = 200;

/*
  Turns raw query-string values into a page request, or undefined when the
  caller did not ask for one. Undefined means "no pagination" — the endpoints
  that still return everything rely on that, so a missing page must not
  silently become page 1.
*/
export function parsePageRequest(
  rawPage: unknown,
  rawPageSize: unknown,
): PageRequest | undefined {
  if (rawPage === undefined && rawPageSize === undefined) return undefined;

  const page = toPositiveInt(rawPage) ?? 1;
  const requested = toPositiveInt(rawPageSize) ?? DEFAULT_PAGE_SIZE;

  return { page, pageSize: Math.min(requested, MAX_PAGE_SIZE) };
}

function toPositiveInt(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return undefined;
  return n;
}

// Prisma's skip/take, derived in one place so no call site can get it wrong.
export function toSkipTake(page: PageRequest): { skip: number; take: number } {
  return { skip: (page.page - 1) * page.pageSize, take: page.pageSize };
}

/*
  Wraps a page of already-mapped DTOs. When no page was requested the result is
  still an envelope, so the client has one response shape to handle either way.
*/
export function toPaginated<T>(
  data: T[],
  total: number,
  page?: PageRequest,
): Paginated<T> {
  const pageSize = page?.pageSize ?? (total || 1);

  return {
    data,
    page: page?.page ?? 1,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
