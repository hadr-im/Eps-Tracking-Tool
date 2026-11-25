// GET /admin/dashboard — everything the admin page draws, in one call.

import { apiClient } from './apiClient';
import type {
  AdminDashboardApiResponse,
  AdminDashboardDto,
  AdminPeriod,
  ExpaRange,
} from '../types/admin';

export async function fetchAdminDashboard(
  period: AdminPeriod = 'month',
  range: ExpaRange = 'day',
): Promise<AdminDashboardDto> {
  const { data } = await apiClient.get<AdminDashboardApiResponse>('/admin/dashboard', {
    params: { period, range },
  });
  return data.data;
}
