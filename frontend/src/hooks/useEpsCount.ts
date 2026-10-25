/*
  Counts EPs matching a filter, without pulling the rows.

  Needed because the pipeline stats are about the whole list while the table
  now only holds one page of it. Counting the rows on screen would quietly
  turn "12 of 200 contacted" into "12 of 50", which reads as progress the
  member has not made.

  Asks for a single row and reads `total` off the envelope — the server
  computes the count either way, so this costs one small response.
*/

import { useQuery } from '@tanstack/react-query';
import { fetchMyEps } from '../services/epService';
import type { EpFilters } from '../types/ep';

export function useEpsCount(
  filters: EpFilters & { memberId?: string } = {},
  enabled = true,
) {
  const query = useQuery({
    queryKey: ['eps', 'count', filters],
    queryFn: () => fetchMyEps(filters, 1, 1),
    staleTime: 30_000,
    enabled,
  });

  return query.data?.total ?? 0;
}
