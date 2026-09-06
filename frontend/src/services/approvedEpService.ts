// Composed by useApprovedEps hook
// GET /approved-eps (TL/VP only, returns EPs at APPROVED+ status with full ApprovedDetail)

import { apiClient } from './apiClient';
import type { ApprovedEp, ApprovedEpFilters, ApprovedEpsApiResponse } from '../types/approvedEp';

export async function fetchApprovedEps(
  filters: ApprovedEpFilters = {},
): Promise<ApprovedEp[]> {
  const params: Record<string, string> = {};

  if (filters.product) params['product'] = filters.product;
  if (filters.status)  params['status']  = filters.status;
  if (filters.search)  params['search']  = filters.search;

  const { data } = await apiClient.get<ApprovedEpsApiResponse>('/approved-eps', { params });
  return data.data;
}
