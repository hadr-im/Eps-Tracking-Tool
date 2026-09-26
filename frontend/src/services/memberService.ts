// memberService (VP-only member management)

import { apiClient } from './apiClient';
import type { AccessChanges, ManagedMember } from '../types/members';

interface MembersResponse {
  data: ManagedMember[];
  count: number;
}

export async function fetchMembers(): Promise<ManagedMember[]> {
  const { data } = await apiClient.get<MembersResponse>('/users/members');
  return data.data;
}

export async function updateMemberAccess(
  userId: string,
  changes: AccessChanges,
): Promise<ManagedMember> {
  const { data } = await apiClient.patch<{ data: ManagedMember }>(
    `/users/${userId}/access`,
    changes,
  );
  return data.data;
}
