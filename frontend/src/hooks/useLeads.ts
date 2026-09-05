// fetches the department leads pool with optional server-side filters
// TL / VP only (refreshes automatically when filters change)

import { useQuery } from '@tanstack/react-query';
import { fetchLeads } from '../services/leadService';
import type { LeadFilters } from '../types/lead';

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => fetchLeads(filters),
    placeholderData: (prev) => prev, // keep previous data while re-fetching (no layout flash)
    staleTime: 30_000,
  });
}
