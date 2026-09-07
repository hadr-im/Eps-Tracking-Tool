// useDepartmentDashboard (fetches the VP-level department dashboard)
// GET /dashboard/department (VP only)
// months param controls how far back the trend chart reaches (default 6)

import { useQuery } from '@tanstack/react-query';
import { fetchDepartmentDashboard } from '../services/dashboardService';

export function useDepartmentDashboard(months = 6) {
  return useQuery({
    queryKey: ['dashboard', 'department', months],
    queryFn: () => fetchDepartmentDashboard(months),
    staleTime: 60_000,
    retry: 1,
  });
}
