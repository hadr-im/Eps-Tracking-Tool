// useMyDashboard: React Query hook for GET /dashboard/me
// Accepts an optional memberId prop so this hook can be reused inside Team Dashboards when a TL views a specific member's stats

import { useQuery } from '@tanstack/react-query';
import { fetchMyDashboard, fetchMemberDashboard } from '../services/dashboardService';

interface UseMyDashboardOptions {
  // If provided, fetches a specific member's dashboard (TL/VP only)
  memberId?: string;
}

export function useMyDashboard({ memberId }: UseMyDashboardOptions = {}) {
  return useQuery({
    queryKey: memberId ? ['dashboard', 'member', memberId] : ['dashboard', 'me'],
    queryFn: () => (memberId ? fetchMemberDashboard(memberId) : fetchMyDashboard()),
    staleTime: 60_000, // 1 min (dashboard data changes less frequently than CRM edits)
    retry: 1,
  });
}
