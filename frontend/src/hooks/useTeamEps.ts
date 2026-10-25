// useTeamEps (fetches a page of EPs for a specific member (TL/VP view))
// Calls GET /eps?memberId=:id (backend scopes to caller's department automatically)
// Reuses the same fetchMyEps service function; the backend differentiates by role

import { usePaginatedQuery } from './usePaginatedQuery';
import { fetchMyEps } from '../services/epService';
import type { EpFilters } from '../types/ep';

export function useTeamEps(memberId: string | null, filters: EpFilters = {}, page = 1) {
  return usePaginatedQuery({
    queryKey: ['eps', 'team', memberId, filters],
    fetchPage: (p, size) =>
      fetchMyEps({ ...filters, memberId } as EpFilters & { memberId?: string }, p, size),
    page,
    enabled: !!memberId,
    staleTime: 30_000,
  });
}
