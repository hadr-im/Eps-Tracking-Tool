// usePendingAccounts (VP approval queue: list, approve, reject)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';

import {
  approveAccount,
  fetchPendingAccounts,
  rejectAccount,
} from '../services/approvalService';
import type { ApprovalOverrides } from '../types/signup';

const QUERY_KEY = ['users', 'pending'];

export function usePendingAccounts(status: 'PENDING' | 'REJECTED' = 'PENDING') {
  return useQuery({
    queryKey: [...QUERY_KEY, status],
    queryFn: () => fetchPendingAccounts(status),
    staleTime: 30_000,
  });
}

/*
  Approval can fail for a reason the VP needs to read in full — another VP may
  have taken the dispatcher slot while this request sat in the queue — so the
  server's message is surfaced rather than a generic one.
*/
function serverMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message.trim() !== '') return message;
  }
  return fallback;
}

export function useApproveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, overrides }: { userId: string; overrides?: ApprovalOverrides }) =>
      approveAccount(userId, overrides ?? {}),
    onSuccess: () => {
      toast.success('Account approved');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      // The new member may now appear in department member pickers
      void queryClient.invalidateQueries({ queryKey: ['department-members'] });
    },
    onError: (err) => {
      toast.error(serverMessage(err, "Couldn't approve this account"));
    },
  });
}

export function useRejectAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string | null }) =>
      rejectAccount(userId, reason),
    onSuccess: () => {
      toast.success('Request declined');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      toast.error(serverMessage(err, "Couldn't decline this request"));
    },
  });
}
