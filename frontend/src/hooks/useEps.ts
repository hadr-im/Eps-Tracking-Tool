// React Query hook that fetches a page of the current member's assigned EPs
// Re-fetches when filters or page change, and prefetches the next page

import { usePaginatedQuery } from './usePaginatedQuery';
import { fetchMyEps } from '../services/epService';
import type { EpFilters } from '../types/ep';

export function useEps(filters: EpFilters = {}, page = 1) {
  return usePaginatedQuery({
    // Include filters in the key so any filter change triggers a fresh fetch
    queryKey: ['eps', filters],
    fetchPage: (p, size) => fetchMyEps(filters, p, size),
    page,
    staleTime: 30_000, // EPs don't change that frequently
  });
}
