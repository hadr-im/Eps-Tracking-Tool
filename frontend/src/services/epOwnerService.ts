// Reassign an EP to a different member of the same department.
// TL / VP only — enforced by the backend.

import { apiClient } from './apiClient';

export async function reassignEpOwner(epId: string, memberId: string): Promise<void> {
  await apiClient.patch(`/eps/${epId}/owner`, { memberId });
}
