// Member management types
// Mirrors backend/src/Application/use-cases/user/MemberManagementUseCase.ts

import type { UserRole } from './auth';

// An approved account in the caller's department
export interface ManagedMember {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  teamLeaderId: string | null;
  isDispatcher: boolean;
  isDisabled: boolean;
  avatarUrl: string | null;
}

/*
  Body of PATCH /users/:id/access.
  Every field is optional — omitting one leaves that part unchanged.
*/
export interface AccessChanges {
  role?: UserRole;
  teamLeaderId?: string | null;
  isDispatcher?: boolean;
  isDisabled?: boolean;
}
