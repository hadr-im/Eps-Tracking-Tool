// React Query mutation for PATCH /eps/:id
// Invalidates ['eps'] on success so the table refreshes automatically

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchEp } from '../services/epService';
import type { EpUpdatePayload } from '../types/ep';

interface UpdateEpArgs {
  id: string;
  payload: EpUpdatePayload;
}

export function useUpdateEp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateEpArgs) => patchEp(id, payload),
    onSuccess: () => {
      // Invalidate all ['eps', *] queries so any active filter combination refreshes
      queryClient.invalidateQueries({ queryKey: ['eps'] });
    },
  });
}
