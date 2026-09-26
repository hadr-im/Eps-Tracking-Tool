// useSignupOptions (public lookups that populate step 2 of the signup form)
// Both are reachable without a token, since the caller has no account yet.

import { useQuery } from '@tanstack/react-query';
import { fetchDepartments, fetchTeamLeaders } from '../services/signupService';

export function useDepartments() {
  return useQuery({
    queryKey: ['signup-options', 'departments'],
    queryFn: fetchDepartments,
    // The departments themselves never change, but hasVp / hasDispatcher do,
    // and a stale value would offer a position that is no longer available.
    staleTime: 30_000,
  });
}

export function useTeamLeaders(departmentId: string | null) {
  return useQuery({
    queryKey: ['signup-options', 'team-leaders', departmentId],
    queryFn: () => fetchTeamLeaders(departmentId!),
    enabled: !!departmentId,
    staleTime: 60_000,
  });
}
