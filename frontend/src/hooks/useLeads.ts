// fetches a page of the department leads pool with server-side filters
// TL / VP only (refetches when filters or page change, and prefetches the next page)

import { usePaginatedQuery } from './usePaginatedQuery';
import { fetchLeads } from '../services/leadService';
import type { LeadFilters } from '../types/lead';

export function useLeads(filters: LeadFilters = {}, page = 1) {
  return usePaginatedQuery({
    queryKey: ['leads', filters],
    fetchPage: (p, size) => fetchLeads(filters, p, size),
    page,
    staleTime: 30_000,
  });
}
