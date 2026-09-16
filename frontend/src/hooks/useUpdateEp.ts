// React Query mutation for PATCH /eps/:id
// Invalidates ['eps'] on success so the table refreshes automatically

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchEp } from '../services/epService';
import type { EpUpdatePayload } from '../types/ep';
import { toast } from 'sonner';

interface UpdateEpArgs {
  id: string;
  payload: EpUpdatePayload;
}

// Fields that get a success toast (discrete changes, not free-text typing)
const TOASTED_FIELDS: (keyof EpUpdatePayload)[] = [
  'contacted',
  'interested',
  'trackingPhase',
  'duration',
  'cvLink',
  'availability',
];

function getSuccessMessage(payload: EpUpdatePayload): string | null {
  if ('contacted' in payload)
    return payload.contacted ? 'Marked as contacted ✓' : 'Marked as not contacted';
  if ('interested' in payload)
    return payload.interested ? 'Marked as interested ✓' : 'Marked as not interested';
  if ('trackingPhase' in payload)
    return payload.trackingPhase ? 'Phase updated' : 'Phase cleared';
  if ('duration' in payload)
    return payload.duration ? 'Duration saved' : 'Duration cleared';
  if ('cvLink' in payload)
    return payload.cvLink ? 'CV link saved' : 'CV link cleared';
  if ('availability' in payload)
    return payload.availability ? 'Availability saved' : 'Availability cleared';
  return null; // source / notes — silent on success
}

export function useUpdateEp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateEpArgs) => patchEp(id, payload),

    onMutate: async ({ id, payload }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['eps'] });

      // Snapshot the previous state (to roll back if it fails)
      const previousQueries = queryClient.getQueriesData({ queryKey: ['eps'] });

      // Optimistically update all queries that contain this EP
      queryClient.setQueriesData({ queryKey: ['eps'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.map((ep: any) => 
            ep.id === id ? { ...ep, ...payload } : ep
          );
        }
        return oldData;
      });

      return { previousQueries };
    },

    onSuccess: (updatedEp, { payload }) => {
      // Update cache with the actual returned data from the server
      queryClient.setQueriesData({ queryKey: ['eps'] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.map((ep: any) => (ep.id === updatedEp.id ? updatedEp : ep));
        }
        return oldData;
      });
      
      const msg = getSuccessMessage(payload);
      if (msg) toast.success(msg);
    },

    onError: (_err, { payload }, context) => {
      // Rollback to the previous state
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
      }

      const isToasted = TOASTED_FIELDS.some((f) => f in payload);
      toast.error(isToasted
        ? 'We couldn\'t save that change. Please try again.'
        : 'We couldn\'t save your notes. Please try again.');
    },
    
    onSettled: () => {
      // Always refetch after error or success to ensure backend sync
      queryClient.invalidateQueries({ queryKey: ['eps'] });
    }
  });
}

