import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';

// Fetches the current user's full profile from GET /users/me
export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: userService.getMyProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
