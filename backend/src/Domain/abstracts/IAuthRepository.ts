import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { OtpToken } from '../entities/OtpToken';
import { UserRole } from '../enums/UserRole';
import { AccountStatus } from '../enums/AccountStatus';

/*
  The access a VP actually grants when approving an account. Defaults to what
  the user requested, but the VP may correct any of it before approving.
*/
export interface GrantedAccess {
  role: UserRole;
  departmentId: string;
  teamLeaderId: string | null;
  isDispatcher: boolean;
}

/*
  What a VP can change on an existing account after approval — people get
  promoted, hand over the dispatcher role, move between teams and leave.
*/
export interface ManagedAccess {
  role: UserRole;
  teamLeaderId: string | null;
  isDispatcher: boolean;
  isDisabled: boolean;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  product: string;
  /*
    Whether the single-holder roles are already taken. The signup form uses
    these to stop offering a position that cannot be granted, instead of
    letting someone fill in the whole form only to be rejected.
  */
  hasVp: boolean;
  hasDispatcher: boolean;
}

/*
 Repository contract for all auth-related persistence operations.
 Defined in the Domain layer so use-cases depend only on this abstraction, the concrete Prisma implementation lives in Infrastructure.
 */
export interface IAuthRepository {
  // User queries 

  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  // Insert or update a user record and return the persisted entity
  save(user: User): Promise<User>;
  // Atomically set (or clear) a member's assigned Team Leader
  assignTeamLeader(memberId: string, teamLeaderId: string | null): Promise<User>;
  // Returns all active (non-disabled) members assigned to a given Team Leader
  findMembersByTeamLeader(teamLeaderId: string): Promise<User[]>;

  // Account approval

  // True when the department id refers to a real department
  departmentExists(departmentId: string): Promise<boolean>;
  // Every department, for the signup form's department picker
  listDepartments(): Promise<DepartmentSummary[]>;
  /*
    Signup requests in a given state, oldest first.
    Scoped by the department the applicant REQUESTED, because an unapproved
    account has no granted department yet.
  */
  findUsersByStatus(status: AccountStatus, requestedDepartmentId?: string): Promise<User[]>;
  // Every active account in a department, for the member management screen
  findDepartmentUsers(departmentId: string): Promise<User[]>;
  // Applies a role/team/dispatcher/enabled change to an already-approved account
  updateUserAccess(userId: string, access: ManagedAccess): Promise<User>;
  /*
    The department's current dispatcher, or null. Used to give a friendly error
    naming the existing holder before the DB unique index would reject it.
  */
  findActiveDispatcher(departmentId: string): Promise<User | null>;
  // The department's current VP, or null. Same purpose as findActiveDispatcher.
  findActiveVp(departmentId: string): Promise<User | null>;
  // Active Team Leaders in a department, for the member's "who is your TL" picker
  findTeamLeadersByDepartment(departmentId: string): Promise<User[]>;
  /*
    Approve a pending account: copies the granted access onto the real fields
    and flips status to ACTIVE. This is the ONLY place privileges are granted.
  */
  approveUser(userId: string, grant: GrantedAccess, reviewerId: string): Promise<User>;
  // Decline a pending account. Granted fields are left empty.
  rejectUser(userId: string, reviewerId: string, reason: string | null): Promise<User>;

  // Refresh-token operations 

  saveRefreshToken(token: RefreshToken): Promise<RefreshToken>;
  /*
   Returns all non-revoked, non-expired tokens for a user.
   Used during refresh/logout to find the matching token via bcrypt.compare.
   */
  findActiveTokensByUser(userId: string): Promise<RefreshToken[]>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;

  // OTP operations 

  saveOtp(otp: OtpToken): Promise<OtpToken>;
  // Find the latest valid (not used, not expired) OTP for a user. 
  findValidOtpByUserId(userId: string): Promise<OtpToken | null>;
  // Mark an OTP as used so it cannot be replayed.
  invalidateOtp(id: string): Promise<void>;
}
