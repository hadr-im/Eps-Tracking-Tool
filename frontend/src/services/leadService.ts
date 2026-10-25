// Pure async functions for the Leads & Dispatch API calls

import { apiClient } from './apiClient';
import { PAGE_SIZE } from '../types/pagination';
import type { Page } from '../types/pagination';
import type {
  Lead,
  LeadsApiResponse,
  LeadFilters,
  DispatchPayload,
  DispatchApiResponse,
} from '../types/lead';

/*
  GET /leads
  TL / VP only (returns LEAD, CONTACTED, INTERESTED EPs for the dept)

  Filtering is server-side, which is what makes paging safe: search runs across
  the whole pool and then the matching rows are paged, rather than searching
  whichever 50 rows happen to be loaded.
*/
export async function fetchLeads(
  filters: LeadFilters = {},
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<Page<Lead>> {
  const params: Record<string, string> = {
    page: String(page),
    pageSize: String(pageSize),
  };

  if (filters.search)       params['search']       = filters.search;
  if (filters.university)   params['university']   = filters.university;
  if (filters.fieldOfStudy) params['fieldOfStudy'] = filters.fieldOfStudy;
  if (filters.yearOfStudy)  params['yearOfStudy']  = filters.yearOfStudy;
  if (filters.product)      params['product']      = filters.product;
  if (filters.createdFrom)  params['createdFrom']  = filters.createdFrom;
  if (filters.createdTo)    params['createdTo']    = filters.createdTo;

  const { data } = await apiClient.get<LeadsApiResponse>('/leads', { params });
  return data;
}

// POST /dispatch
// Team Leaders and VPs only (assigns one or more EPs to a member)
export async function dispatchLeads(payload: DispatchPayload): Promise<DispatchApiResponse> {
  const { data } = await apiClient.post<DispatchApiResponse>('/dispatch', payload);
  return data;
}
