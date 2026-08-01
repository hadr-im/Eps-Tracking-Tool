import { PrismaClient } from '@prisma/client';
import type { Ep as PrismaEp, User as PrismaUser } from '@prisma/client';

import { IDispatchRepository } from '../../Domain/abstracts/IDispatchRepository';
import { Ep } from '../../Domain/entities/Ep';
import { User } from '../../Domain/entities/User';
import { Product } from '../../Domain/enums/Product';
import { EpStatus } from '../../Domain/enums/EpStatus';
import { UserRole } from '../../Domain/enums/UserRole';
import { AuthProvider } from '../../Domain/enums/AuthProvider';
import { DispatchFilters } from '../../Application/use-cases/dispatch/DispatchFilters';
import { prisma } from '../Database/PrismaService';

export class DispatchRepository implements IDispatchRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /*
   Fetches the unassigned leads pool for a department
   ownerId = null means the EP has not been dispatched yet
   All filters are applied at the DB level 
   */
  async getUnassignedLeads(departmentId: string, filters?: DispatchFilters): Promise<Ep[]> {
    const rows = await this.db.ep.findMany({
      where: {
        departmentId,
        ownerId: null,
        ...(filters?.product    && { product: filters.product as any }),
        ...(filters?.status     && { statusOnExpa: filters.status as any }),
        ...(filters?.university && { university: { contains: filters.university, mode: 'insensitive' } }),
        ...(filters?.fieldOfStudy && { fieldOfStudy: { contains: filters.fieldOfStudy, mode: 'insensitive' } }),
        ...(filters?.createdFrom || filters?.createdTo
          ? {
              createdAtExpa: {
                ...(filters.createdFrom && { gte: new Date(filters.createdFrom) }),
                ...(filters.createdTo   && { lte: new Date(filters.createdTo) }),
              },
            }
          : {}),
      },
      orderBy: { createdAtExpa: 'desc' },
    });

    return rows.map((r) => this.toEpEntity(r));
  }

  /*
   Assigns EPs to a member in a single updateMany call
   assignedAt is stamped by the server here (never accepted from the client)
   */
  async assignEpsToMember(epIds: string[], memberId: string): Promise<Ep[]> {
    const assignedAt = new Date();

    await this.db.ep.updateMany({
      where: { id: { in: epIds }, ownerId: null },
      data: { ownerId: memberId, assignedAt },
    });

    // Return the freshly updated rows as domain entities
    const rows = await this.db.ep.findMany({
      where: { id: { in: epIds } },
    });

    return rows.map((r) => this.toEpEntity(r));
  }

  /*
   Returns active (non-disabled) members of a department
   Used to populate the dispatch dropdown
   */
  async getDepartmentMembers(departmentId: string): Promise<User[]> {
    const rows = await this.db.user.findMany({
      where: { departmentId, isDisabled: false },
      orderBy: { fullName: 'asc' },
    });

    return rows.map((r) => this.toUserEntity(r));
  }

  // Private mappers (Prisma row -> Domain entity)

  private toEpEntity(row: PrismaEp): Ep {
    return new Ep(
      row.id,
      row.fullName,
      row.email,
      row.phone,
      row.university,
      row.fieldOfStudy,
      row.product as unknown as Product,
      row.departmentId,
      row.statusOnExpa as unknown as EpStatus,
      row.createdAtExpa,
      row.syncedAt,
    );
  }

  private toUserEntity(row: PrismaUser): User {
    return new User(
      row.id,
      row.email,
      row.passwordHash,
      row.fullName,
      row.role as unknown as UserRole,
      row.provider as unknown as AuthProvider,
      row.googleId,
      row.departmentId,
      row.isDispatcher,
      row.isDisabled,
      row.createdAt,
      row.updatedAt,
    );
  }
}
