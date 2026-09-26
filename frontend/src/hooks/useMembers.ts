// useMembers (VP-only member management: list + change access)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';

import { fetchMembers, updateMemberAccess } from '../services/memberService';
import type { AccessChanges } from '../types/members';

const QUERY_KEY = ['users', 'members'];

export function useMembers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchMembers,
    staleTime: 30_000,
  });
}

// The server explains refusals precisely ("This department already has a
// dispatcher"), so surface its message rather than a generic one.
function serverMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message.trim() !== '') return message;
  }
  return fallback;
}

export function useUpdateMemberAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, changes }: { userId: string; changes: AccessChanges }) =>
      updateMemberAccess(userId, changes),
    onSuccess: () => {
      toast.success('Member updated');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      // Role and team changes ripple into the pickers and the signup form
      void queryClient.invalidateQueries({ queryKey: ['department-members'] });
      void queryClient.invalidateQueries({ queryKey: ['signup-options'] });
    },
    onError: (err) => {
      toast.error(serverMessage(err, "Couldn't update this member"));
    },
  });
}
