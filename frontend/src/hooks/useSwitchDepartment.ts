/*
  Changes which department the signed-in LCP is supervising.

  The response carries a new access token as well as the user, because
  departmentId is a claim inside the token — keeping the old one would leave
  every subsequent request scoped to the previous department until it expired.
  Routing it through the context's `login` replaces both at once.

  Everything cached is then dropped except the department list itself. Every
  other query is department-scoped and would describe the wrong one after a
  switch, so removing them wholesale is safer than naming the keys that matter
  and missing one.

  The exception matters: the list of departments is the same whichever one you
  are in, and it is what the sidebar switcher is drawn from. Clearing it too
  made the three links vanish for as long as the refetch took, so the control
  you had just used disappeared under your cursor.
*/

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import { apiClient } from '../services/apiClient';
import { useAuth } from './useAuth';
import type { AuthUser } from '../types/auth';

interface SwitchResponse {
  user: AuthUser;
  accessToken: string;
}

export function useSwitchDepartment() {
  const { login } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departmentId: string) => {
      const { data } = await apiClient.patch<SwitchResponse>('/auth/me/department', {
        departmentId,
      });
      return data;
    },
    onSuccess: (data) => {
      login({ user: data.user, accessToken: data.accessToken });
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'signup-options',
      });
    },
    onError: (err) => {
      const message =
        axios.isAxiosError(err) && (err.response?.data as { message?: string })?.message;
      toast.error(message || "Couldn't switch department. Please try again.");
    },
  });
}
