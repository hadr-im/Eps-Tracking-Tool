import { useQuery } from '@tanstack/react-query';
import { fetchTransitions } from '../services/epService';

export function useTransitions() {
  return useQuery({
    queryKey: ['transitions'],
    queryFn: fetchTransitions,
    staleTime: 60_000,
  });
}
