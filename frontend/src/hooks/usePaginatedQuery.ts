/*
  One place for the paging behaviour the list pages share.

  Two things beyond a plain useQuery:

  - The previous page stays on screen while the next one loads, so changing
    page does not collapse the table to a spinner and bounce the scroll
    position.

  - The next page is fetched in the background once the current one arrives.
    Paging forward is the overwhelmingly common move, and by the time the user
    clicks, the data is usually already in the cache and the table swaps
    instantly. Going back needs no prefetch — React Query still holds that page
    under its own key.
*/

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Page } from '@/types/pagination';
import { PAGE_SIZE } from '@/types/pagination';

interface Options<T> {
  // Identifies the list, without the page number — that is appended here.
  queryKey: readonly unknown[];
  fetchPage: (page: number, pageSize: number) => Promise<Page<T>>;
  page: number;
  pageSize?: number;
  staleTime?: number;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({
  queryKey,
  fetchPage,
  page,
  pageSize = PAGE_SIZE,
  staleTime = 60_000,
  enabled = true,
}: Options<T>) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: () => fetchPage(page, pageSize),
    placeholderData: (prev) => prev,
    staleTime,
    enabled,
  });

  const totalPages = query.data?.totalPages ?? 1;

  /*
    Serialised because queryKey is rebuilt on every render — a filter object
    that is equal but not identical would otherwise re-fire this effect
    endlessly.
  */
  const keyId = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled || page >= totalPages) return;

    const next = page + 1;
    queryClient.prefetchQuery({
      queryKey: [...queryKey, next, pageSize],
      queryFn: () => fetchPage(next, pageSize),
      staleTime,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyId, page, pageSize, totalPages, enabled, staleTime]);

  return query;
}
