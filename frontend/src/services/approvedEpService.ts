// Composed by useApprovedEps hook
// GET /approved-eps (TL/VP only, returns EPs at APPROVED+ status with full ApprovedDetail)

import { apiClient } from './apiClient';
import { PAGE_SIZE } from '../types/pagination';
import type { Page } from '../types/pagination';
import type { ApprovedEp, ApprovedEpFilters, ApprovedEpsApiResponse } from '../types/approvedEp';

export async function fetchApprovedEps(
  filters: ApprovedEpFilters = {},
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<Page<ApprovedEp>> {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };

  if (filters.status)      params['status']      = filters.status;
  if (filters.search)      params['search']      = filters.search;
  if (filters.university)  params['university']  = filters.university;
  if (filters.createdFrom) params['createdFrom'] = filters.createdFrom;
  if (filters.createdTo)   params['createdTo']   = filters.createdTo;

  const { data } = await apiClient.get<ApprovedEpsApiResponse>('/approved-eps', { params });
  return data;
}
