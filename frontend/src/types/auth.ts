// Auth types (mirrors backend DTOs and UserMapper.toResponse())
// Keep in sync with:
//   backend/src/Application/dtos/auth/*.ts
//   backend/src/Application/mappers/UserMapper.ts

// Mirrors backend/src/Domain/enums/UserRole.ts 
export type UserRole = 'MEMBER' | 'TEAM_LEADER' | 'VP';

// The user object stored in AuthContext.
 // Only auth-essential fields 

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  isDispatcher: boolean;
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


// POST /auth/signup (mirrors SignupDto)
// password:  min 8 chars
// fullName:  min 2 chars
 
export interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  departmentId?: string;
}

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
