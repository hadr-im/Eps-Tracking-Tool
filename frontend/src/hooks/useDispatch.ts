// useDispatch (mutation for POST /dispatch)
// On success: invalidates ['leads'] so dispatched rows disappear immediately without a manual refresh

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatchLeads } from '../services/leadService';
import type { DispatchPayload } from '../types/lead';

export function useDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DispatchPayload) => dispatchLeads(payload),
    onSuccess: () => {
      // Invalidate all ['leads', *] so the pool refreshes and dispatched rows vanish
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
