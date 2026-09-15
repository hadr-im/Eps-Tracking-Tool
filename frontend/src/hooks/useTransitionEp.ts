// useTransitionEp (mutation for POST /eps/:id/transition)
// On success: invalidates ['eps'] so the transitioned EP vanishes from the member's view immediately

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transitionEp } from '../services/epService';
import { toast } from 'sonner';

export function useTransitionEp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, targetProduct }: { id: string; targetProduct: string }) =>
      transitionEp(id, targetProduct),
    onSuccess: (_data, { targetProduct }) => {
      queryClient.invalidateQueries({ queryKey: ['eps'] });
      toast.success(`EP transitioned to ${targetProduct}`);
    },
    onError: () => {
      toast.error('Transition failed — please try again');
    },
  });
}

