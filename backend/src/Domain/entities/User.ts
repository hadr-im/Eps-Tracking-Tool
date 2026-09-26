import { UserRole } from '../enums/UserRole';
import { AuthProvider } from '../enums/AuthProvider';
import { AccountStatus } from '../enums/AccountStatus';

/*
  What a user asked for during signup.

  Deliberately kept separate from the granted fields on User (role,
  departmentId, teamLeaderId, isDispatcher). Signup writes here; only approval
  copies these across. If a status check is ever missed somewhere, an
  unapproved account still reads as a MEMBER with no department, which the
  existing authorisation code already rejects.
*/
export interface RequestedAccess {
  role: UserRole | null;
  departmentId: string | null;
  teamLeaderId: string | null;
  isDispatcher: boolean;
}

/*
 Domain entity representing a system user.
 Pure class – zero ORM/framework coupling.
 */
export class User {
  constructor(
    public readonly id: string,
    public email: string,
    // Null for OAuth accounts that have no password.
    public passwordHash: string | null,
    public fullName: string,
    public role: UserRole,
    public provider: AuthProvider,
    // Null for LOCAL accounts.
    public googleId: string | null,
    // Optional department assignment.
    public departmentId: string | null,
    public isDispatcher: boolean,
    public isDisabled: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public avatarUrl: string | null = null,
    public teamLeaderId: string | null = null,
    // Defaults to ACTIVE so existing construction sites (and seeded accounts)
    // keep working; the signup path passes PENDING explicitly.
    public status: AccountStatus = AccountStatus.ACTIVE,
    public requested: RequestedAccess | null = null,
    // Shown back to the applicant when they try to sign in after a rejection.
    public rejectionReason: string | null = null,
  ) {}
}
