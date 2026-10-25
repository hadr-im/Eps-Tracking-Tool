// useEpsUnderProcess fetches all EPs whose trackingPhase is LOOKING_FOR_OPPORTUNITIES
// TL/VP only (backend enforces role via GET /eps/under-process)
// The department and the phase are fixed server-side; only the optional
// university / field / date filters are sent.

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import type { Ep, EpsApiResponse } from '../types/ep';

export interface UnderProcessFilters {
  university?: string;
  fieldOfStudy?: string;
  createdFrom?: string;
  createdTo?: string;
}

async function fetchEpsUnderProcess(filters: UnderProcessFilters): Promise<Ep[]> {
  const params: Record<string, string> = {};
  if (filters.university)   params['university']   = filters.university;
  if (filters.fieldOfStudy) params['fieldOfStudy'] = filters.fieldOfStudy;
  if (filters.createdFrom)  params['createdFrom']  = filters.createdFrom;
  if (filters.createdTo)    params['createdTo']    = filters.createdTo;

  const { data } = await apiClient.get<EpsApiResponse>('/eps/under-process', { params });
  return data.data;
}

export function useEpsUnderProcess(filters: UnderProcessFilters = {}) {
  return useQuery({
    queryKey: ['eps', 'under-process', filters],
    queryFn: () => fetchEpsUnderProcess(filters),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
