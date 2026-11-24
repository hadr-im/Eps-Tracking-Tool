// GET /admin/dashboard — everything the admin page draws, in one call.

import { apiClient } from './apiClient';
import type { AdminDashboardApiResponse, AdminDashboardDto, AdminPeriod } from '../types/admin';

export async function fetchAdminDashboard(
  period: AdminPeriod = 'month',
  hours = 24,
): Promise<AdminDashboardDto> {
  const { data } = await apiClient.get<AdminDashboardApiResponse>('/admin/dashboard', {
    params: { period, hours },
  });
  return data.data;
}
