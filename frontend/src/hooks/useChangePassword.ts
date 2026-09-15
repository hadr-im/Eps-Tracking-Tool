import { useMutation } from '@tanstack/react-query';
import { userService, type ChangePasswordPayload } from '@/services/userService';
import { getFriendlyError } from '@/lib/utils';
import { toast } from 'sonner';

// Mutation to POST /users/me/change-password
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => userService.changePassword(payload),
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (err: unknown) => {
      toast.error(getFriendlyError(err, {
        400: 'The current password you entered is incorrect.',
        401: 'The current password you entered is incorrect.',
        422: 'Your new password doesn\'t meet the requirements.',
      }, 'Couldn\'t update your password. Please try again.'));
    },
  });
}


