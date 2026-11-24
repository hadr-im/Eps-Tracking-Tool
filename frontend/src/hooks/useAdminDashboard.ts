import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchAdminDashboard } from '../services/adminService';
import type { AdminPeriod } from '../types/admin';

export function useAdminDashboard(period: AdminPeriod = 'month', hours = 24) {
  return useQuery({
    queryKey: ['admin', 'dashboard', period, hours],
    queryFn: () => fetchAdminDashboard(period, hours),
    /*
      Shorter than the other dashboards: the EXPA counter is the one number
      on the page that is worth watching move, and an hour's quota can be
      spent in a couple of minutes during a sync.
    */
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
    // Changing the period keeps the previous figures up rather than blanking
    // the page, as on the other dashboards.
    placeholderData: keepPreviousData,
  });
}
