// useTransitionEp (mutation for POST /eps/:id/transition)
// On success: invalidates ['eps'] so the transitioned EP vanishes from the member's view immediately

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transitionEp } from '../services/epService';

export function useTransitionEp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, targetProduct }: { id: string; targetProduct: string }) =>
      transitionEp(id, targetProduct),
    onSuccess: () => {
      // Refresh the EP list (the transitioned EP will no longer be returned as it's unassigned/moved)
      queryClient.invalidateQueries({ queryKey: ['eps'] });
    },
  });
}
