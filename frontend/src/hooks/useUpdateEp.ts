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
    onSuccess: (_data, { payload }) => {
      queryClient.invalidateQueries({ queryKey: ['eps'] });
      const msg = getSuccessMessage(payload);
      if (msg) toast.success(msg);
    },
    onError: (_err, { payload }) => {
      const isToasted = TOASTED_FIELDS.some((f) => f in payload);
      toast.error(isToasted ? 'Failed to save changes' : 'Failed to save');
    },
  });
}

