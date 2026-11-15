// useDepartmentDashboard (fetches the VP-level department dashboard)
// GET /dashboard/department (VP only)
// months param controls how far back the trend chart reaches (default 6)

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchDepartmentDashboard } from '../services/dashboardService';
import type { DateWindow } from '../services/dashboardService';

export function useDepartmentDashboard(months = 6, window: DateWindow = {}) {
  return useQuery({
    // The window is part of the key, so changing period refetches rather than
    // showing the previous period's numbers.
    queryKey: ['dashboard', 'department', months, window],
    queryFn: () => fetchDepartmentDashboard(months, window),
    staleTime: 60_000,
    retry: 1,
    /*
      The previous period's figures stay up while the new ones load. Without
      this the whole dashboard — every chart, every card — dropped back to
      skeletons on each change of the dropdown.
    */
    placeholderData: keepPreviousData,
  });
}
