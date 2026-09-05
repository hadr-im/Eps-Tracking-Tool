// Pure async functions for the Leads & Dispatch API calls

import { apiClient } from './apiClient';
import type {
  Lead,
  LeadsApiResponse,
  LeadFilters,
  DispatchPayload,
  DispatchApiResponse,
} from '../types/lead';

// GET /leads
// TL / VP only (returns LEAD, CONTACTED, INTERESTED EPs for the dept)
export async function fetchLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const params: Record<string, string> = {};

  if (filters.search)      params['search']      = filters.search;
  if (filters.university)  params['university']  = filters.university;
  if (filters.product)     params['product']     = filters.product;
  if (filters.createdFrom) params['createdFrom'] = filters.createdFrom;
  if (filters.createdTo)   params['createdTo']   = filters.createdTo;

  const { data } = await apiClient.get<LeadsApiResponse>('/leads', { params });
  return data.data;
}

// POST /dispatch
// Dispatcher TL only (assigns one or more EPs to a member)
export async function dispatchLeads(payload: DispatchPayload): Promise<DispatchApiResponse> {
  const { data } = await apiClient.post<DispatchApiResponse>('/dispatch', payload);
  return data;
}
