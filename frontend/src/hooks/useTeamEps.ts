// useTeamEps (fetches EPs for a specific member (TL/VP view))
// Calls GET /eps?memberId=:id (backend scopes to caller's department automatically)
// Reuses the same fetchMyEps service function; the backend differentiates by role

import { useQuery } from '@tanstack/react-query';
import { fetchMyEps } from '../services/epService';
import type { EpFilters } from '../types/ep';

export function useTeamEps(memberId: string | null, filters: EpFilters = {}) {
  return useQuery({
    queryKey: ['eps', 'team', memberId, filters],
    queryFn: () => fetchMyEps({ ...filters, memberId } as EpFilters & { memberId?: string }),
    enabled: !!memberId,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
