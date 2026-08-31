// departmentService.ts (Pure async functions for Department/Member API calls)
// Composed by useDepartmentMembers hook

import { apiClient } from './apiClient';

// Shape of a member returned by GET /departments/:id/members
export interface DepartmentMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isDispatcher: boolean;
}

interface MembersApiResponse {
  data: DepartmentMember[];
  count: number;
}

// GET /departments/:departmentId/members
// TL/VP only (returns all members of the department)
export async function fetchDepartmentMembers(departmentId: string): Promise<DepartmentMember[]> {
  const { data } = await apiClient.get<MembersApiResponse>(
    `/departments/${departmentId}/members`,
  );
  return data.data;
}
