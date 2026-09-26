// Signup + approval types
// Mirrors backend/src/Application/dtos/auth/SignupDto.ts,
//         backend/src/Application/use-cases/user/AccountApprovalUseCase.ts

import type { AccountStatus, AuthUser, UserRole } from './auth';

export interface Department {
  id: string;
  name: string;
  product: string;
  // Single-holder roles already taken in this department
  hasVp: boolean;
  hasDispatcher: boolean;
}

export interface TeamLeaderOption {
  id: string;
  fullName: string;
}

/*
  Step 2 of the signup form: where in the organisation the applicant says they
  belong. Nothing here is granted — a VP confirms it before it takes effect.
*/
export interface PlacementValue {
  requestedDepartmentId: string;
  // Empty string = nothing picked yet
  requestedRole: UserRole | '';
  // null = "I don't know yet", filled in by the approving VP
  requestedTeamLeaderId: string | null;
  requestedIsDispatcher: boolean;
  /*
    Required when requestedRole is VP. Only a VP can approve an account, so a
    VP request has nobody to approve it — this shared code stands in for that
    approval and lets the account through immediately.
  */
  vpSetupCode: string;
}

export const EMPTY_PLACEMENT: PlacementValue = {
  requestedDepartmentId: '',
  requestedRole: '',
  requestedTeamLeaderId: null,
  requestedIsDispatcher: false,
  vpSetupCode: '',
};

// POST /auth/signup
export interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
  requestedRole: UserRole;
  requestedDepartmentId: string;
  requestedTeamLeaderId?: string | null;
  requestedIsDispatcher?: boolean;
  vpSetupCode?: string;
}

// POST /auth/complete-signup
export interface CompleteGoogleSignupPayload {
  setupToken: string;
  requestedRole: UserRole;
  requestedDepartmentId: string;
  requestedTeamLeaderId?: string | null;
  requestedIsDispatcher?: boolean;
  vpSetupCode?: string;
}

/*
  What signup returns.

  `accessToken` is present only when the account is already usable (a VP with
  a valid setup code) — the server issues the session as part of signup, so
  the user goes straight into the app rather than back to the login page.
  Pending accounts come back without one.
*/
export interface SignupResponse {
  user: AuthUser;
  accessToken?: string;
}

// What a VP asked for, as shown in the approval queue
export interface RequestedAccess {
  role: UserRole | null;
  departmentId: string | null;
  teamLeaderId: string | null;
  isDispatcher: boolean;
}

// A row in GET /users/pending
export interface PendingAccount {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  status: AccountStatus;
  requested: RequestedAccess | null;
  createdAt: string;
}

// Body of POST /users/:id/approve — omit a field to keep what was requested
export interface ApprovalOverrides {
  role?: UserRole;
  teamLeaderId?: string | null;
  isDispatcher?: boolean;
}
