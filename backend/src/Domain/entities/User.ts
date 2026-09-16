import { UserRole } from '../enums/UserRole';
import { AuthProvider } from '../enums/AuthProvider';

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
  ) {}
}
