// React Query hook that fetches the current member's assigned EPs
// Re-fetches automatically when filters change

import { useQuery } from '@tanstack/react-query';
import { fetchMyEps } from '../services/epService';
import type { EpFilters } from '../types/ep';

export function useEps(filters: EpFilters = {}) {
  return useQuery({
    // Include filters in the key so any filter change triggers a fresh fetch
    queryKey: ['eps', filters],
    queryFn: () => fetchMyEps(filters),
    // Keep previous data visible while new data loads (no flash of empty table)
    placeholderData: (previousData) => previousData,
    staleTime: 30_000, // 30s EPs don't change that frequently
  });
}
