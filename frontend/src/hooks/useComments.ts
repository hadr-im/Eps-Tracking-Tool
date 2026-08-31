// useComments (fetches comments for a specific EP)
// Enabled only when an epId is provided (i.e. comment panel is open)

import { useQuery } from '@tanstack/react-query';
import { fetchComments } from '../services/commentService';

export function useComments(epId: string | null) {
  return useQuery({
    queryKey: ['comments', epId],
    queryFn: () => fetchComments(epId!),
    enabled: !!epId,
    staleTime: 10_000, // 10s (comments can be added frequently)
  });
}
