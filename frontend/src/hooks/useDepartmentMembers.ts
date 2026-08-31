// useDepartmentMembers (fetches all members of the caller's department)
// TL / VP only. Requires the caller's departmentId from AuthContext

import { useQuery } from '@tanstack/react-query';
import { fetchDepartmentMembers } from '../services/departmentService';

export function useDepartmentMembers(departmentId: string | null) {
  return useQuery({
    queryKey: ['department-members', departmentId],
    queryFn: () => fetchDepartmentMembers(departmentId!),
    enabled: !!departmentId,  // skip if no departmentId (unauthenticated or no dept assigned)
    staleTime: 5 * 60_000,   // 5 min 
  });
}
