// Auth types (mirrors backend DTOs and UserMapper.toResponse())
// Keep in sync with:
//   backend/src/Application/dtos/auth/*.ts
//   backend/src/Application/mappers/UserMapper.ts

// Mirrors backend/src/Domain/enums/UserRole.ts 
export type UserRole = 'MEMBER' | 'TEAM_LEADER' | 'VP' | 'LCP';

/*
  An LCP has a VP's authority over whichever department they are currently
  supervising, so every permission check that asks "is this a VP?" means
  "VP or above". Routing it through one helper keeps a new privileged role
  from having to be remembered in a dozen separate comparisons.
*/
export function isVpLevel(role: UserRole | undefined): boolean {
  return role === 'VP' || role === 'LCP';
}

// Only an LCP can move between departments.
export function canSwitchDepartment(role: UserRole | undefined): boolean {
  return role === 'LCP';
}

// Mirrors backend/src/Domain/enums/AuthProvider.ts
export type AuthProvider = 'LOCAL' | 'GOOGLE';

// Mirrors backend/src/Domain/enums/AccountStatus.ts
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

// The user object stored in AuthContext.
 // Only auth-essential fields 

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  provider: AuthProvider;
  departmentId: string | null;
  teamLeaderId: string | null;
  avatarUrl: string | null;
  // Only ACTIVE accounts can reach an authenticated screen, but the field is
  // carried so the UI never has to guess.
  status: AccountStatus;
}

// Shape returned by the backend on POST /auth/login and GET /auth/google/callback 
export interface AuthTokens {
  accessToken: string;
  user: AuthUser;
}

// Request payload types (one per auth endpoint, mirroring backend DTOs)

// POST /auth/login (mirrors LoginDto)
export interface LoginPayload {
  email: string;
  password: string;
}


// Signup payloads live in ./signup.ts alongside the rest of the signup flow.

// POST /auth/forgot-password (mirrors ForgotPasswordDto)
export interface ForgotPasswordPayload {
  email: string;
}

// POST /auth/reset-password (mirrors ResetPasswordDto)
// otp: exactly 6 chars
// newPassword: min 8 chars
 
export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}
