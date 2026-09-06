// useApprovedEps — fetches all APPROVED+ EPs for the caller's department
// TL/VP only (backend enforces role). Supports product / status / search filters (server-side).
// Comment support is reused via useComments / useAddComment from Card 3 (Team CRM).

import { useQuery } from '@tanstack/react-query';
import { fetchApprovedEps } from '../services/approvedEpService';
import type { ApprovedEpFilters } from '../types/approvedEp';

export function useApprovedEps(filters: ApprovedEpFilters = {}) {
  return useQuery({
    queryKey: ['approved-eps', filters],
    queryFn: () => fetchApprovedEps(filters),
    placeholderData: (prev) => prev,
    staleTime: 60_000, // 1 min — operational data, changes infrequently
  });
}
