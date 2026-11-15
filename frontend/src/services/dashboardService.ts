// Pure async functions for Dashboard API calls
// Composed by useMyDashboard hook

import { apiClient } from './apiClient';
import type {
  DashboardApiResponse,
  MemberDashboardDto,
  VpDashboardApiResponse,
  VpDashboardDto,
} from '../types/dashboard';

// GET /dashboard/me
// Returns the personal dashboard for the logged-in user
// MEMBER gets their own stats; TL/VP gets their own stats + member breakdown
/*
  The optional sign-up-date window. Omitted keys are left out of the query
  string entirely, so "all time" sends no params and hits the same cache entry
  it always did.
*/
export interface DateWindow {
  from?: string;
  to?: string;
}

function windowParams(w: DateWindow = {}): Record<string, string> {
  return { ...(w.from && { from: w.from }), ...(w.to && { to: w.to }) };
}

export async function fetchMyDashboard(w: DateWindow = {}): Promise<MemberDashboardDto> {
  const { data } = await apiClient.get<DashboardApiResponse>('/dashboard/me', {
    params: windowParams(w),
  });
  return data.data;
}

// GET /dashboard/member/:id
// Returns the personal dashboard for a specific member (TL/VP only)
export async function fetchMemberDashboard(
  memberId: string,
  w: DateWindow = {},
): Promise<MemberDashboardDto> {
  const { data } = await apiClient.get<DashboardApiResponse>(`/dashboard/member/${memberId}`, {
    params: windowParams(w),
  });
  return data.data;
}

// GET /dashboard/department
// Returns the VP-level department dashboard (VP only)
export async function fetchDepartmentDashboard(
  months = 6,
  w: DateWindow = {},
): Promise<VpDashboardDto> {
  const { data } = await apiClient.get<VpDashboardApiResponse>('/dashboard/department', {
    params: { months, ...windowParams(w) },
  });
  return data.data;
}
