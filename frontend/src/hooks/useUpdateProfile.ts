import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, type UpdateProfilePayload } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Mutation to PATCH /users/me
// On success: syncs the updated name/avatar into AuthContext (sidebar reflects immediately)
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userService.updateProfile(payload),
    onSuccess: (updated) => {
      // Sync into AuthContext so sidebar name/avatar updates without page reload
      updateUser({
        fullName: updated.fullName,
        avatarUrl: updated.avatarUrl,
      });
      // Invalidate profile cache so next open is fresh
      void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Profile updated');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });
}

