import { PrismaClient } from '@prisma/client';
import type {
  User as PrismaUser,
  RefreshToken as PrismaRefreshToken,
  PasswordResetOtp as PrismaOtp,
} from '@prisma/client';

import {
  IAuthRepository,
  GrantedAccess,
  ManagedAccess,
  DepartmentSummary,
} from '../../Domain/abstracts/IAuthRepository';
import { User } from '../../Domain/entities/User';
import { RefreshToken } from '../../Domain/entities/RefreshToken';
import { OtpToken } from '../../Domain/entities/OtpToken';
import { UserRole } from '../../Domain/enums/UserRole';
import { AuthProvider } from '../../Domain/enums/AuthProvider';
import { AccountStatus } from '../../Domain/enums/AccountStatus';
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
      status: user.status,
      requestedRole: user.requested?.role ?? null,
      requestedDepartmentId: user.requested?.departmentId ?? null,
      requestedTeamLeaderId: user.requested?.teamLeaderId ?? null,
      requestedIsDispatcher: user.requested?.isDispatcher ?? false,
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

  // Account approval

  async departmentExists(departmentId: string): Promise<boolean> {
    const row = await this.db.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });
    return row !== null;
  }

  /*
    Departments plus whether their single-holder roles are taken.

    Only granted values count: a pending applicant has no department and no
    role yet, so an unapproved VP request never makes a department look
    occupied. Disabled accounts are excluded too, which reopens the slot
    during a handover.
  */
  async listDepartments(): Promise<DepartmentSummary[]> {
    const [rows, holders] = await Promise.all([
      this.db.department.findMany({
        select: { id: true, name: true, product: true },
        orderBy: { name: 'asc' },
      }),
      this.db.user.findMany({
        where: {
          isDisabled: false,
          departmentId: { not: null },
          OR: [{ role: UserRole.VP }, { isDispatcher: true }],
        },
        select: { departmentId: true, role: true, isDispatcher: true },
      }),
    ]);

    const vpTaken = new Set<string>();
    const dispatcherTaken = new Set<string>();
    for (const h of holders) {
      if (!h.departmentId) continue;
      if (h.role === UserRole.VP) vpTaken.add(h.departmentId);
      if (h.isDispatcher) dispatcherTaken.add(h.departmentId);
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      product: String(r.product),
      hasVp: vpTaken.has(r.id),
      hasDispatcher: dispatcherTaken.has(r.id),
    }));
  }

  async findUsersByStatus(
    status: AccountStatus,
    requestedDepartmentId?: string,
  ): Promise<User[]> {
    const rows = await this.db.user.findMany({
      where: {
        status,
        ...(requestedDepartmentId !== undefined && { requestedDepartmentId }),
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toUserEntity(r));
  }

  // Approved accounts in a department, including disabled ones so a VP can
  // see and re-enable someone who left.
  async findDepartmentUsers(departmentId: string): Promise<User[]> {
    const rows = await this.db.user.findMany({
      where: { departmentId, status: AccountStatus.ACTIVE },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
    return rows.map((r) => this.toUserEntity(r));
  }

  async updateUserAccess(userId: string, access: ManagedAccess): Promise<User> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: {
        role: access.role,
        teamLeaderId: access.teamLeaderId,
        isDispatcher: access.isDispatcher,
        isDisabled: access.isDisabled,
      },
    });
    return this.toUserEntity(row);
  }

  async findActiveDispatcher(departmentId: string): Promise<User | null> {
    const row = await this.db.user.findFirst({
      where: { departmentId, isDispatcher: true, isDisabled: false },
    });
    return row ? this.toUserEntity(row) : null;
  }

  async findActiveVp(departmentId: string): Promise<User | null> {
    const row = await this.db.user.findFirst({
      where: { departmentId, role: UserRole.VP, isDisabled: false },
    });
    return row ? this.toUserEntity(row) : null;
  }

  async findTeamLeadersByDepartment(departmentId: string): Promise<User[]> {
    const rows = await this.db.user.findMany({
      where: {
        departmentId,
        role: UserRole.TEAM_LEADER,
        isDisabled: false,
        status: AccountStatus.ACTIVE,
      },
      orderBy: { fullName: 'asc' },
    });
    return rows.map((r) => this.toUserEntity(r));
  }

  /*
    Grants the approved access in a single UPDATE. The partial unique indexes
    one_dispatcher_per_department / one_vp_per_department are the final
    authority here: if two VPs approve conflicting requests at the same moment,
    Postgres rejects the loser and the use case turns that into a 409.
  */
  async approveUser(userId: string, grant: GrantedAccess, reviewerId: string): Promise<User> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: {
        role: grant.role,
        departmentId: grant.departmentId,
        teamLeaderId: grant.teamLeaderId,
        isDispatcher: grant.isDispatcher,
        status: AccountStatus.ACTIVE,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });
    return this.toUserEntity(row);
  }

  async rejectUser(userId: string, reviewerId: string, reason: string | null): Promise<User> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: {
        status: AccountStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
    return this.toUserEntity(row);
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
      row.status as AccountStatus,
      {
        role: (row.requestedRole as UserRole | null) ?? null,
        departmentId: row.requestedDepartmentId,
        teamLeaderId: row.requestedTeamLeaderId,
        isDispatcher: row.requestedIsDispatcher,
      },
      row.rejectionReason,
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
