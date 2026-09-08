import { useMutation } from '@tanstack/react-query';
import { userService, type ChangePasswordPayload } from '@/services/userService';

// Mutation to POST /users/me/change-password
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => userService.changePassword(payload),
  });
}
