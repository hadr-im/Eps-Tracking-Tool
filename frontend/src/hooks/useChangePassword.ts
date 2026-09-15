import { useMutation } from '@tanstack/react-query';
import { userService, type ChangePasswordPayload } from '@/services/userService';
import { toast } from 'sonner';

// Mutation to POST /users/me/change-password
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => userService.changePassword(payload),
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : 'Failed to change password';
      toast.error(msg);
    },
  });
}

