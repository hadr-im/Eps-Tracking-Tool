// useApprovedEps — fetches a page of APPROVED+ EPs for the caller's department
// TL/VP only (backend enforces role). Product / status / search filters are server-side.
// Comment support is reused via useComments / useAddComment from Card 3 (Team CRM).

import { usePaginatedQuery } from './usePaginatedQuery';
import { fetchApprovedEps } from '../services/approvedEpService';
import type { ApprovedEpFilters } from '../types/approvedEp';

export function useApprovedEps(filters: ApprovedEpFilters = {}, page = 1) {
  return usePaginatedQuery({
    queryKey: ['approved-eps', filters],
    fetchPage: (p, size) => fetchApprovedEps(filters, p, size),
    page,
    staleTime: 60_000, // operational data, changes infrequently
  });
}
