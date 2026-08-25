import { apiClient } from './apiClient';
import type { Ep, EpFilters, EpUpdatePayload, EpsApiResponse } from '../types/ep';

// GET /eps 
// Server-side filtered. MEMBER role -> backend automatically scopes to caller's own assigned EPs (no memberId param needed)

export async function fetchMyEps(filters: EpFilters = {}): Promise<Ep[]> {
  const params: Record<string, string> = {};

  // All filters are applied server-side in the Prisma WHERE clause
  if (filters.trackingPhase) params['trackingPhase'] = filters.trackingPhase;
  if (filters.duration)      params['duration']      = filters.duration;
  if (filters.contacted)     params['contacted']     = filters.contacted;
  if (filters.interested)    params['interested']    = filters.interested;
  if (filters.search)        params['search']        = filters.search;

  const { data } = await apiClient.get<EpsApiResponse>('/eps', { params });
  return data.data;
}

// PATCH /eps/:id 
// Partial update of CRM fields (contactedAt is auto-stamped server-side)

export async function patchEp(id: string, payload: EpUpdatePayload): Promise<Ep> {
  const { data } = await apiClient.patch<{ data: Ep }>(`/eps/${id}`, payload);
  return data.data;
}
