import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { OtpToken } from '../entities/OtpToken';

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
