// useEpsUnderProcess fetches all EPs whose trackingPhase is LOOKING_FOR_OPPORTUNITIES
// TL/VP only (backend enforces role via GET /eps/under-process)
// No filters sent (the backend already scopes to the caller's department + fixed phase)

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import type { Ep, EpsApiResponse } from '../types/ep';

async function fetchEpsUnderProcess(): Promise<Ep[]> {
  const { data } = await apiClient.get<EpsApiResponse>('/eps/under-process');
  return data.data;
}

export function useEpsUnderProcess() {
  return useQuery({
    queryKey: ['eps', 'under-process'],
    queryFn: fetchEpsUnderProcess,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
