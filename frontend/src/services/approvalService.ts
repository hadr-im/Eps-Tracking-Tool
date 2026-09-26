// approvalService (VP-only signup approval queue)

import { apiClient } from './apiClient';
import type { ApprovalOverrides, PendingAccount } from '../types/signup';

interface PendingResponse {
  data: PendingAccount[];
  count: number;
}

/*
  Signup requests in the caller's department.
  'REJECTED' lists declined ones so a VP can reverse the decision — the
  applicant cannot re-apply, because their email is already taken.
*/
export async function fetchPendingAccounts(
  status: 'PENDING' | 'REJECTED' = 'PENDING',
): Promise<PendingAccount[]> {
  const { data } = await apiClient.get<PendingResponse>('/users/pending', {
    params: { status },
  });
  return data.data;
}

/*
  Approves an account. Any field in `overrides` replaces what the applicant
  requested; omitting the body entirely approves exactly what was asked for.
*/
export async function approveAccount(
  userId: string,
  overrides: ApprovalOverrides = {},
): Promise<void> {
  await apiClient.post(`/users/${userId}/approve`, overrides);
}

export async function rejectAccount(userId: string, reason: string | null): Promise<void> {
  await apiClient.post(`/users/${userId}/reject`, reason ? { reason } : {});
}
