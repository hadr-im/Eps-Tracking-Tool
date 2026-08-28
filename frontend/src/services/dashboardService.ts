// Pure async functions for Dashboard API calls
// Composed by useMyDashboard hook

import { apiClient } from './apiClient';
import type { DashboardApiResponse, MemberDashboardDto } from '../types/dashboard';

// GET /dashboard/me
// Returns the personal dashboard for the logged-in user
// MEMBER gets their own stats; TL/VP gets their own stats + member breakdown
export async function fetchMyDashboard(): Promise<MemberDashboardDto> {
  const { data } = await apiClient.get<DashboardApiResponse>('/dashboard/me');
  return data.data;
}

// GET /dashboard/member/:id
// Returns the personal dashboard for a specific member (TL/VP only)
export async function fetchMemberDashboard(memberId: string): Promise<MemberDashboardDto> {
  const { data } = await apiClient.get<DashboardApiResponse>(`/dashboard/member/${memberId}`);
  return data.data;
}
