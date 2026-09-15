// useDispatch (mutation for POST /dispatch)
// On success: invalidates ['leads'] so dispatched rows disappear immediately without a manual refresh

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatchLeads } from '../services/leadService';
import type { DispatchPayload } from '../types/lead';
import { toast } from 'sonner';

export function useDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DispatchPayload) => dispatchLeads(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      const count = payload.epIds.length;
      toast.success(`${count} lead${count !== 1 ? 's' : ''} dispatched successfully`);
    },
    onError: () => {
      toast.error('Couldn\'t assign this lead. Please try again.');
    },
  });
}

