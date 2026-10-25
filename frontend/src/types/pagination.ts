// The envelope every paginated list endpoint returns.

export interface Page<T> {
  data: T[];
  // Rows in this page.
  count: number;
  page: number;
  pageSize: number;
  // Rows matching the filters across every page — what the page controls read.
  total: number;
  totalPages: number;
}

export const PAGE_SIZE = 50;

/*
  Used while the first page is still in flight, so consumers can read
  `.data`, `.total` and `.totalPages` without a null check on every line.
*/
export function emptyPage<T>(): Page<T> {
  return { data: [], count: 0, page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };
}
