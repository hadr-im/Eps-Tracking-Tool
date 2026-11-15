// useMyDashboard: React Query hook for GET /dashboard/me
// Accepts an optional memberId prop so this hook can be reused inside Team Dashboards when a TL views a specific member's stats

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchMyDashboard, fetchMemberDashboard } from '../services/dashboardService';
import type { DateWindow } from '../services/dashboardService';

interface UseMyDashboardOptions {
  // If provided, fetches a specific member's dashboard (TL/VP only)
  memberId?: string;
  // Optional sign-up-date window; omitted means all time.
  window?: DateWindow;
}

export function useMyDashboard({ memberId, window = {} }: UseMyDashboardOptions = {}) {
  return useQuery({
    // The window is part of the key, so changing period refetches rather than
    // showing the previous period's numbers.
    queryKey: memberId
      ? ['dashboard', 'member', memberId, window]
      : ['dashboard', 'me', window],
    queryFn: () =>
      memberId ? fetchMemberDashboard(memberId, window) : fetchMyDashboard(window),
    staleTime: 60_000, // 1 min (dashboard data changes less frequently than CRM edits)
    retry: 1,
    /*
      Changing the period keeps the previous numbers on screen while the new
      ones load, instead of replacing the whole page with skeletons. The window
      is part of the key, so every change was a brand-new query and the page
      went blank each time — which read as a full reload rather than a filter.
      `isFetching` is what tells the reader the figures are being refreshed.
    */
    placeholderData: keepPreviousData,
  });
}
