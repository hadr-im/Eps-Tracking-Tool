import { PrismaClient } from '@prisma/client';
import type {
  Ep as PrismaEp,
  ApprovedDetail as PrismaApprovedDetail,
  Product as PrismaProduct,
} from '@prisma/client';

import { IEpRepository, EpStatusSnapshot, EpWithDetail, TransitionInput } from '../../Domain/abstracts/IEpRepository';
import { Ep } from '../../Domain/entities/Ep';
import { ApprovedDetail } from '../../Domain/entities/ApprovedDetail';
import { StatusHistory } from '../../Domain/entities/StatusHistory';
import { EpStatus } from '../../Domain/enums/EpStatus';
import { Product } from '../../Domain/enums/Product';
import { TrackingPhase } from '../../Domain/enums/TrackingPhase';
import { Duration } from '../../Domain/enums/Duration';
import { Availability } from '../../Domain/enums/Availability';
import { EpFilters } from '../../Application/use-cases/ep/EpFilters';
import { EpUpdateData } from '../../Application/use-cases/ep/EpUpdateData';
import { prisma } from '../Database/PrismaService';

export class EpRepository implements IEpRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }


  async findStatusSnapshotsByDepartment(departmentId: string): Promise<EpStatusSnapshot[]> {
    const rows = await this.db.ep.findMany({
      where: { departmentId },
      select: {
        id: true,
        statusOnExpa: true,
        approvedDetail: { select: { id: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      statusOnExpa: r.statusOnExpa,
      hasApprovedDetail: r.approvedDetail !== null,
    }));
  }

  async findApprovedByDepartment(departmentId: string): Promise<Ep[]> {
    const approvedStatuses: EpStatus[] = [
      EpStatus.APPROVED,
      EpStatus.REALIZED,
      EpStatus.COMPLETED,
      EpStatus.FINISHED,
    ];
    const rows = await this.db.ep.findMany({
      where: { departmentId, statusOnExpa: { in: approvedStatuses } },
    });
    return rows.map((r) => this.toEpEntity(r));
  }

  async findByExpaId(epId: string): Promise<Ep | null> {
    const row = await this.db.ep.findUnique({ where: { id: epId } });
    return row ? this.toEpEntity(row) : null;
  }

  // Alias, same lookup, clearer name for EP management use cases
  async findById(epId: string): Promise<Ep | null> {
    const row = await this.db.ep.findUnique({ where: { id: epId } });
    return row ? this.toEpEntity(row) : null;
  }

  // Returns all EPs assigned to a specific member, server-side filtered
  async findByOwner(ownerId: string, filters?: EpFilters): Promise<Ep[]> {
    const rows = await this.db.ep.findMany({
      where: {
        ownerId,
        ...this.buildWhere(filters),
      },
      orderBy: { assignedAt: 'desc' },
    });
    return rows.map((r) => this.toEpEntity(r));
  }

  // Returns EPs assigned to any of the given members (TL-scoped view)
  // Returns an empty array immediately when ownerIds is empty (no DB hit)
  async findByOwners(ownerIds: string[], filters?: EpFilters): Promise<Ep[]> {
    if (ownerIds.length === 0) return [];
    const rows = await this.db.ep.findMany({
      where: {
        ownerId: { in: ownerIds },
        ...this.buildWhere(filters),
      },
      orderBy: { assignedAt: 'desc' },
    });
    return rows.map((r) => this.toEpEntity(r));
  }

  // Returns all EPs for a department, optionally filtered (overrides the old unfilterd version)
  async findByDepartment(departmentId: string, filters?: EpFilters): Promise<Ep[]> {
    const rows = await this.db.ep.findMany({
      where: {
        departmentId,
        ...this.buildWhere(filters),
      },
      orderBy: { createdAtExpa: 'desc' },
    });
    return rows.map((r) => this.toEpEntity(r));
  }

  // Partial update, only fields present in data are written
  async updateEp(epId: string, data: EpUpdateData): Promise<Ep> {
    const updatePayload: Record<string, unknown> = {};

    if ('source'         in data) updatePayload['source']         = data.source;
    if ('cvLink'         in data) updatePayload['cvLink']         = data.cvLink;
    if ('trackingPhase'  in data) updatePayload['trackingPhase']  = data.trackingPhase;
    if ('notes'          in data) updatePayload['notes']          = data.notes;
    if ('duration'       in data) updatePayload['duration']       = data.duration;
    if ('availability'   in data) updatePayload['availability']   = data.availability;
    if ('interested'     in data) updatePayload['interested']     = data.interested;

    // contacted: auto-stamp contactedAt only on first time it becomes true
    if ('contacted' in data && data.contacted === true) {
      updatePayload['contacted'] = true;
      // Only stamp if not already set (preserved on subsequent edits)
      const existing = await this.db.ep.findUnique({ where: { id: epId }, select: { contactedAt: true } });
      if (!existing?.contactedAt) {
        updatePayload['contactedAt'] = new Date();
      }
    } else if ('contacted' in data) {
      updatePayload['contacted'] = data.contacted;
    }

    const row = await this.db.ep.update({
      where: { id: epId },
      data: updatePayload,
    });
    return this.toEpEntity(row);
  }

  async reassignOwner(epId: string, memberId: string): Promise<Ep> {
    const row = await this.db.ep.update({
      where: { id: epId },
      data: { ownerId: memberId, assignedAt: new Date() },
    });
    return this.toEpEntity(row);
  }

  /**
   Atomically transitions an EP to a new product/department.
  Uses a Prisma interactive transaction:
      1. Updates ep.product, ep.departmentId, ep.ownerId = null
      2. Creates a TransitionHistory row
    If either write fails, both are rolled back.
   */
  async transitionEp(epId: string, input: TransitionInput): Promise<Ep> {
    const updatedRow = await this.db.$transaction(async (tx) => {
      // 1. Move the EP to the target product + department, unassign it
      const ep = await tx.ep.update({
        where: { id: epId },
        data: {
          product:      input.targetProduct      as unknown as PrismaProduct,
          departmentId: input.targetDepartmentId,
          ownerId:      null,
          assignedAt:   null,
        },
      });

      // 2. Record the transition history
      await tx.transitionHistory.create({
        data: {
          epId,
          triggeredById:  input.triggeredById,
          fromProduct:    input.fromProduct    as unknown as any,
          toProduct:      input.targetProduct  as unknown as any,
          fromDepartment: input.fromDepartmentId,
          toDepartment:   input.targetDepartmentId,
          note:           input.note ?? null,
        },
      });

      return ep;
    });

    return this.toEpEntity(updatedRow);
  }

  async findByDepartmentFiltered(
    departmentId: string,
    filters: EpFilters,
  ): Promise<EpWithDetail[]> {
    const statusFilter = filters.status
      ? Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status
      : undefined;

    const rows = await this.db.ep.findMany({
      where: {
        departmentId,
        ...(filters.product    && { product: filters.product as unknown as any }),
        ...(statusFilter       && { statusOnExpa: statusFilter }),
        ...(filters.university && { university: filters.university }),
        ...(filters.fieldOfStudy && { fieldOfStudy: filters.fieldOfStudy }),
        ...(filters.search && {
          fullName: { contains: filters.search, mode: 'insensitive' as const },
        }),
        ...(filters.createdFrom || filters.createdTo
          ? {
              createdAtExpa: {
                ...(filters.createdFrom && { gte: new Date(filters.createdFrom) }),
                ...(filters.createdTo   && { lte: new Date(filters.createdTo) }),
              },
            }
          : {}),

          ...(filters.hostingMC || filters.hostingLC
          ? {
              approvedDetail: {
                ...(filters.hostingMC && { hostingMC: filters.hostingMC }),
                ...(filters.hostingLC && { hostingLC: filters.hostingLC }),
              },
            }
          : {}),
        ...(filters.unassignedOnly && { ownerId: null }),
      },
      include: {
        approvedDetail: true,
        owner: { select: { fullName: true } },
      },
      orderBy: { createdAtExpa: 'desc' },
    });

    return rows.map((r) => ({
      ep: this.toEpEntity(r),
      approvedDetail: r.approvedDetail ? this.toApprovedDetailEntity(r.approvedDetail) : null,
      memberName: r.owner?.fullName ?? null,
    }));
  }

  // Single write 

  async save(ep: Ep): Promise<Ep> {
    const data = this.toDbData(ep);
    const row = await this.db.ep.upsert({
      where: { id: ep.id },
      update: data,
      create: { id: ep.id, ...data },
    });
    return this.toEpEntity(row);
  }

  // Bulk writes

  // Uses createMany with skipDuplicates for O(new rows) performance on daily sync
  // On initial seed this inserts everything, on reruns it only touches new EXPA IDs
  // Returns the Prisma count of actually inserted rows (existing IDs are skipped silently)
  async saveMany(eps: Ep[]): Promise<{ count: number }> {
    if (eps.length === 0) return { count: 0 };

    const data = eps.map((ep) => ({ id: ep.id, ...this.toDbData(ep) }));

    return this.db.ep.createMany({ data, skipDuplicates: true });
  }

  // Groups updates by target status so we issue at most one UPDATE per distinct status value 
  async updateManyStatuses(updates: { epId: string; status: EpStatus }[]): Promise<void> {
    if (updates.length === 0) return;

    // Group epIds by their target status
    const grouped = new Map<EpStatus, string[]>();
    for (const { epId, status } of updates) {
      const ids = grouped.get(status) ?? [];
      ids.push(epId);
      grouped.set(status, ids);
    }

    // One updateMany call per distinct target status
    await Promise.all(
      Array.from(grouped.entries()).map(([status, ids]) =>
        this.db.ep.updateMany({
          where: { id: { in: ids } },
          data: { statusOnExpa: status },
        }),
      ),
    );
  }

  // Upserts all ApprovedDetail records in individual upserts run concurrently
  // Prisma doesn't support bulk upsert natively, so we fan out with Promise.all
  async upsertManyApprovedDetails(details: ApprovedDetail[]): Promise<void> {
    if (details.length === 0) return;

    await Promise.all(
      details.map((d) =>
        this.db.approvedDetail.upsert({
          where: { expaAppId: d.expaAppId },
          update: {
            opportunityTitle: d.opportunityTitle,
            hostingMC: d.hostingMC,
            hostingLC: d.hostingLC,
            projectFees: d.projectFees,
            approvalDate: d.approvalDate,
            realizedDate: d.realizedDate,
            completedDate: d.completedDate,
            finishedDate: d.finishedDate,
          },
          create: {
            id: d.id,
            epId: d.epId,
            expaAppId: d.expaAppId,
            opportunityTitle: d.opportunityTitle,
            hostingMC: d.hostingMC,
            hostingLC: d.hostingLC,
            projectFees: d.projectFees,
            approvalDate: d.approvalDate,
            realizedDate: d.realizedDate,
            completedDate: d.completedDate,
            finishedDate: d.finishedDate,
          },
        }),
      ),
    );
  }

  // Single createMany call, StatusHistory is append-only, no upsert needed
  async saveManyStatusHistory(entries: StatusHistory[]): Promise<void> {
    if (entries.length === 0) return;

    await this.db.statusHistory.createMany({
      data: entries.map((e) => ({
        id: e.id,
        epId: e.epId,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        changedAt: e.changedAt,
      })),
    });
  }

  // Private mappers 

  // Builds a Prisma-compatible where fragment from optional EpFilters
  private buildWhere(filters?: EpFilters): object {
    if (!filters) return {};

    const statusFilter = filters.status
      ? Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status
      : undefined;

    return {
      ...(filters.product        && { product: filters.product as unknown as any }),
      ...(statusFilter           && { statusOnExpa: statusFilter }),
      ...(filters.university     && { university: filters.university }),
      ...(filters.fieldOfStudy   && { fieldOfStudy: filters.fieldOfStudy }),
      ...(filters.trackingPhase  && { trackingPhase: filters.trackingPhase as unknown as any }),
      ...(filters.duration       && { duration: filters.duration as unknown as any }),
      // Boolean filters: only applied when explicitly set (undefined = no constraint)
      ...(filters.contacted  !== undefined && { contacted:  filters.contacted }),
      ...(filters.interested !== undefined && { interested: filters.interested }),
      // Partial, case-insensitive fullName search
      ...(filters.search && {
        fullName: { contains: filters.search, mode: 'insensitive' as const },
      }),
      ...(filters.createdFrom || filters.createdTo
        ? {
            createdAtExpa: {
              ...(filters.createdFrom && { gte: new Date(filters.createdFrom) }),
              ...(filters.createdTo   && { lte: new Date(filters.createdTo) }),
            },
          }
        : {}),
      ...(filters.unassignedOnly && { ownerId: null }),
    };
  }

  private toEpEntity(row: PrismaEp): Ep {
    return new Ep(
      row.id,
      row.fullName,
      row.email,
      row.phone,
      row.university,
      row.fieldOfStudy,
      row.yearOfStudy ?? null,
      row.product as unknown as Product,
      row.departmentId,
      row.statusOnExpa,
      row.createdAtExpa,
      row.syncedAt,
      // CRM fields
      row.ownerId,
      row.assignedAt,
      row.source,
      row.cvLink,
      row.contacted,
      row.contactedAt,
      row.interested,
      row.trackingPhase as TrackingPhase | null,
      row.notes,
      row.duration as Duration | null,
      row.availability as Availability | null,
    );
  }

  private toDbData(ep: Ep) {
    return {
      fullName: ep.fullName,
      email: ep.email,
      phone: ep.phone,
      university: ep.university,
      fieldOfStudy: ep.fieldOfStudy,
      product: ep.product as unknown as PrismaProduct,
      departmentId: ep.departmentId,
      statusOnExpa: ep.statusOnExpa,
      createdAtExpa: ep.createdAtExpa,
    };
  }

  private toApprovedDetailEntity(row: PrismaApprovedDetail): ApprovedDetail {
    return new ApprovedDetail(
      row.id,
      row.epId,
      row.expaAppId,
      row.opportunityTitle,
      row.hostingMC,
      row.hostingLC,
      row.projectFees,
      row.approvalDate,
      row.realizedDate,
      row.completedDate,
      row.finishedDate,
      (row as any).contractLink ?? null,
      (row as any).auditFolder  ?? null,
      row.syncedAt,
    );
  }
}