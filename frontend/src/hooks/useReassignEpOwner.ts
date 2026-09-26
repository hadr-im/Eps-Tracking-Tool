import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reassignEpOwner } from '@/services/epOwnerService';
import { getFriendlyError } from '@/lib/utils';

// Reassign an EP to a new owner (TL/VP). Invalidates any query that surfaces
// the EP owner so the tables refresh in place.
export function useReassignEpOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ epId, memberId }: { epId: string; memberId: string }) =>
      reassignEpOwner(epId, memberId),
    onSuccess: () => {
      toast.success('EP reassigned');
      qc.invalidateQueries({ queryKey: ['approved-eps'] });
      qc.invalidateQueries({ queryKey: ['eps'] });
      qc.invalidateQueries({ queryKey: ['team-eps'] });
      qc.invalidateQueries({ queryKey: ['under-process'] });
    },
    onError: (err: unknown) => {
      toast.error(
        getFriendlyError(
          err,
          { 403: "You don't have permission to reassign this EP." },
          "Couldn't reassign the EP. Please try again.",
        ),
      );
    },
  });
}
