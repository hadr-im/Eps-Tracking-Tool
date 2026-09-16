import { PrismaClient } from '@prisma/client';
import type {
  User as PrismaUser,
  RefreshToken as PrismaRefreshToken,
  PasswordResetOtp as PrismaOtp,
} from '@prisma/client';

import { IAuthRepository } from '../../Domain/abstracts/IAuthRepository';
import { User } from '../../Domain/entities/User';
import { RefreshToken } from '../../Domain/entities/RefreshToken';
import { OtpToken } from '../../Domain/entities/OtpToken';
import { UserRole } from '../../Domain/enums/UserRole';
import { AuthProvider } from '../../Domain/enums/AuthProvider';
import { prisma } from '../Database/PrismaService';

export class AuthRepository implements IAuthRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  // User queries

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    return row ? this.toUserEntity(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? this.toUserEntity(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { googleId } });
    return row ? this.toUserEntity(row) : null;
  }

  async save(user: User): Promise<User> {
    const data = {
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      role: user.role,
      provider: user.provider,
      googleId: user.googleId,
      departmentId: user.departmentId,
      teamLeaderId: user.teamLeaderId,
      isDispatcher: user.isDispatcher,
      isDisabled: user.isDisabled,
      avatarUrl: user.avatarUrl,
      updatedAt: user.updatedAt,
    };

    const row = await this.db.user.upsert({
      where: { id: user.id },
      update: data,
      create: { id: user.id, ...data },
    });

    return this.toUserEntity(row);
  }

  // Refresh-token operations 

  async saveRefreshToken(token: RefreshToken): Promise<RefreshToken> {
    const row = await this.db.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        isRevoked: token.isRevoked,
        expiresAt: token.expiresAt,
      },
    });
    return this.toRefreshTokenEntity(row);
  }

  async findActiveTokensByUser(userId: string): Promise<RefreshToken[]> {
    const rows = await this.db.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
    return rows.map(this.toRefreshTokenEntity);
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.db.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  // OTP operations 

  async saveOtp(otp: OtpToken): Promise<OtpToken> {
    const row = await this.db.passwordResetOtp.create({
      data: {
        id: otp.id,
        userId: otp.userId,
        otpHash: otp.otpHash,
        isUsed: otp.isUsed,
        expiresAt: otp.expiresAt,
      },
    });
    return this.toOtpEntity(row);
  }

  async findValidOtpByUserId(userId: string): Promise<OtpToken | null> {
    const row = await this.db.passwordResetOtp.findFirst({
      where: {
        userId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.toOtpEntity(row) : null;
  }

  async invalidateOtp(id: string): Promise<void> {
    await this.db.passwordResetOtp.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  // Team Leader assignment operations

  async assignTeamLeader(memberId: string, teamLeaderId: string | null): Promise<User> {
    const row = await this.db.user.update({
      where: { id: memberId },
      data: { teamLeaderId },
    });
    return this.toUserEntity(row);
  }

  async findMembersByTeamLeader(teamLeaderId: string): Promise<User[]> {
    const rows = await this.db.user.findMany({
      where: { teamLeaderId, isDisabled: false },
      orderBy: { fullName: 'asc' },
    });
    return rows.map((r) => this.toUserEntity(r));
  }

  // Private mappers 

  private toUserEntity(row: PrismaUser): User {
    return new User(
      row.id,
      row.email,
      row.passwordHash,
      row.fullName,
      row.role as UserRole,
      row.provider as AuthProvider,
      row.googleId,
      row.departmentId,
      row.isDispatcher,
      row.isDisabled,
      row.createdAt,
      row.updatedAt,
      row.avatarUrl,
      row.teamLeaderId,
    );
  }

  private toRefreshTokenEntity(row: PrismaRefreshToken): RefreshToken {
    return new RefreshToken(
      row.id,
      row.userId,
      row.tokenHash,
      row.isRevoked,
      row.expiresAt,
      row.createdAt,
    );
  }

  private toOtpEntity(row: PrismaOtp): OtpToken {
    return new OtpToken(
      row.id,
      row.userId,
      row.otpHash,
      row.isUsed,
      row.expiresAt,
      row.createdAt,
    );
  }
}
