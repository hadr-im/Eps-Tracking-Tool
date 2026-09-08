import crypto from 'crypto';
import { User } from '../../Domain/entities/User';
import { UserRole } from '../../Domain/enums/UserRole';
import { AuthProvider } from '../../Domain/enums/AuthProvider';
import type { SignupDto } from '../dtos/auth/SignupDto';
import type { GoogleProfileDto } from '../dtos/auth/GoogleProfileDto';

// Safe user shape returned to clients (never includes passwordHash)
export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  provider: AuthProvider;
  departmentId: string | null;
  isDispatcher: boolean;
  isDisabled: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserMapper {
  /*
    Build a new LOCAL User entity from signup data
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
      dto.role ?? UserRole.MEMBER,
      AuthProvider.LOCAL,
      null,
      dto.departmentId ?? null,
      false,
      false,
      now,
      now,
    );
  }

  /*
   Build a new GOOGLE User entity from the OAuth profile.
   No password — the account can only be accessed via Google until
   the user explicitly sets one through the reset-password flow.
   */
  static fromGoogleProfile(profile: GoogleProfileDto): User {
    const now = new Date();
    return new User(
      crypto.randomUUID(),
      profile.email.toLowerCase().trim(),
      null,
      profile.fullName,
      UserRole.MEMBER,
      AuthProvider.GOOGLE,
      profile.googleId,
      null,
      false,
      false,
      now,
      now,
    );
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
      isDispatcher: user.isDispatcher,
      isDisabled: user.isDisabled,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
