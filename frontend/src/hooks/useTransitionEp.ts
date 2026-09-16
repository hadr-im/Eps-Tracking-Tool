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
    
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['eps'] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ['eps'] });

      // Optimistically remove the EP from the list
      queryClient.setQueriesData({ queryKey: ['eps'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.filter((ep: any) => ep.id !== id);
        }
        return oldData;
      });

      return { previousQueries };
    },

    onSuccess: (_data, { targetProduct }) => {
      toast.success(`EP transitioned to ${targetProduct}`);
    },

    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
      }
      toast.error('Couldn\'t move this EP. Please try again.');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['eps'] });
    },
  });
}

