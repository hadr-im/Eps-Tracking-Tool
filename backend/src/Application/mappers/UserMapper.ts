import crypto from 'crypto';
import { User, RequestedAccess } from '../../Domain/entities/User';
import { UserRole } from '../../Domain/enums/UserRole';
import { AuthProvider } from '../../Domain/enums/AuthProvider';
import { AccountStatus } from '../../Domain/enums/AccountStatus';
import type { SignupDto } from '../dtos/auth/SignupDto';
import type { SetupTokenPayload } from '../../Infrastructure/jwt/JwtService';

// Safe user shape returned to clients (never includes passwordHash)
export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  provider: AuthProvider;
  departmentId: string | null;
  teamLeaderId: string | null;
  isDispatcher: boolean;
  isDisabled: boolean;
  avatarUrl: string | null;
  status: AccountStatus;
  // What this account asked for at signup. Null once there is nothing pending.
  requested: RequestedAccess | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserMapper {
  /*
    Build a new PENDING User from signup data.

    Every granted field is hard-coded to its least-privileged value here, not
    read from the DTO. What the applicant asked for goes into `requested` and
    is only copied across by AccountApprovalUseCase. This function is the one
    place where accepting client input would re-open the privilege-escalation
    hole, so it deliberately ignores the DTO for anything that grants access.

    @param dto      Validated signup DTO
    @param passwordHash  Already-hashed password (hashing belongs to the use-case)
   */
  static fromSignupDto(dto: SignupDto, passwordHash: string): User {
    const now = new Date();
    return new User(
      crypto.randomUUID(),
      dto.email.toLowerCase().trim(),
      passwordHash,
      dto.fullName.trim(),
      UserRole.MEMBER, // granted role — never the requested one
      AuthProvider.LOCAL,
      null,
      null,  // granted department — none until approved
      false, // granted dispatcher — never at signup
      false,
      now,
      now,
      null,
      null,  // granted team leader — none until approved
      AccountStatus.PENDING,
      UserMapper.toRequestedAccess(dto),
    );
  }

  /*
   Build a new PENDING User from a completed Google signup.
   No password: the account can only be accessed via Google until the user
   explicitly sets one through the reset-password flow.
   Same rule as above — nothing the client sent grants any access.
   */
  static fromGoogleSignup(setup: SetupTokenPayload, requested: RequestedAccess): User {
    const now = new Date();
    return new User(
      crypto.randomUUID(),
      setup.email.toLowerCase().trim(),
      null,
      setup.fullName.trim(),
      UserRole.MEMBER,
      AuthProvider.GOOGLE,
      setup.googleId,
      null,
      false,
      false,
      now,
      now,
      setup.avatarUrl,
      null,
      AccountStatus.PENDING,
      requested,
    );
  }

  // Normalises the requested-access portion of any signup DTO
  static toRequestedAccess(dto: {
    requestedRole: UserRole;
    requestedDepartmentId: string;
    requestedTeamLeaderId?: string | null;
    requestedIsDispatcher?: boolean;
  }): RequestedAccess {
    return {
      role: dto.requestedRole,
      departmentId: dto.requestedDepartmentId,
      // Only members belong to a Team Leader
      teamLeaderId:
        dto.requestedRole === UserRole.MEMBER ? (dto.requestedTeamLeaderId ?? null) : null,
      // Only Team Leaders can be the dispatcher
      isDispatcher:
        dto.requestedRole === UserRole.TEAM_LEADER ? (dto.requestedIsDispatcher ?? false) : false,
    };
  }

  // Strip sensitive fields before sending user data to the client
  static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      provider: user.provider,
      departmentId: user.departmentId,
      teamLeaderId: user.teamLeaderId,
      isDispatcher: user.isDispatcher,
      isDisabled: user.isDisabled,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      requested: user.requested,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
