import { PrismaClient } from '@prisma/client';
import type {
  Ep as PrismaEp,
  ApprovedDetail as PrismaApprovedDetail,
  Product as PrismaProduct,
} from '@prisma/client';

import {
  IEpRepository,
  EpStatusSnapshot,
  EpWithDetail,
  TransitionInput,
  EpContactEnrichment,
} from '../../Domain/abstracts/IEpRepository';
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
import { PageRequest, toSkipTake } from '../../Application/use-cases/ep/Pagination';
import { prisma } from '../Database/PrismaService';

/*
  Matches a university by its institution code rather than its full name.

  The sign-up form has recorded the same place several ways — "ISET Sousse"
  alongside "ISET: Institut Supérieur des Études Technologiques de Sousse", and
  EPI under two different spellings — so an equality test on a display name
  matches one variant and quietly drops the others. Every stored value starts
  with the code, so a prefix test catches all of them.

  The codes are chosen so none is a prefix of another (ISSAT vs ISSI, ISIS vs
  ISITCOM, ESSTS vs ESSTHS), which is what keeps this from over-matching.
*/
function universityWhere(code: string): object {
  return { startsWith: code, mode: 'insensitive' as const };
}

/*
  Builds the createdAtExpa constraint for a date-range filter.

  The two bounds are not symmetrical. `from` is a day the user wants included,
  so it starts at midnight; `to` is also a day they want included, but
  createdAtExpa is a timestamp, so comparing against midnight would keep only
  leads that registered exactly at 00:00:00 and drop the rest of that day.
  The upper bound therefore runs to the last millisecond of it.
*/
function dateRangeWhere(from?: string, to?: string): object {
  if (!from && !to) return {};

  const parse = (value: string, endOfDay: boolean): Date | null => {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return endOfDay
      ? new Date(y, m - 1, d, 23, 59, 59, 999)
      : new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const gte = from ? parse(from, false) : null;
  const lte = to ? parse(to, true) : null;

  if (!gte && !lte) return {};

  return {
    createdAtExpa: {
      ...(gte && { gte }),
      ...(lte && { lte }),
    },
  };
}

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
        expaId: true,
        statusOnExpa: true,
        approvedDetail: { select: { id: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      expaId: r.expaId,
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

  async findByExpaIds(expaIds: string[]): Promise<Ep[]> {
    if (expaIds.length === 0) return [];
    const rows = await this.db.ep.findMany({ where: { expaId: { in: expaIds } } });
    return rows.map((r) => this.toEpEntity(r));
  }

  async enrichMany(updates: EpContactEnrichment[]): Promise<number> {
    if (updates.length === 0) return 0;

    /*
      One UPDATE per row, since each carries a different set of fields. Batched
      into a transaction so a partial failure cannot leave half the leads
      enriched. Chunked because Postgres has a parameter ceiling and this can
      span a few thousand rows.
    */
    const CHUNK = 200;
    let written = 0;

    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      await this.db.$transaction(
        chunk.map((u) => {
          const { id, ...fields } = u;
          return this.db.ep.update({ where: { id }, data: fields });
        }),
      );
      written += chunk.length;
    }

    return written;
  }

  // Alias, same lookup, clearer name for EP management use cases
  async findById(epId: string): Promise<Ep | null> {
    const row = await this.db.ep.findUnique({ where: { id: epId } });
    return row ? this.toEpEntity(row) : null;
  }

  /*
    The three list reads below share one shape: build the WHERE, then either
    return everything or a single page plus the total.

    When a page is asked for, the rows and the COUNT go out as one $transaction
    so the pair costs one round-trip rather than two — on a serverless function
    talking to a pooled remote database, the round-trip is most of the cost.
    Without a page there is no COUNT at all: the length of what we already hold
    is the total.
  */
  private async paginate<T>(
    model: { findMany: (args: any) => Promise<any[]>; count: (args: any) => Promise<number> },
    args: Record<string, unknown>,
    page: PageRequest | undefined,
    map: (row: any) => T,
  ): Promise<{ rows: T[]; total: number }> {
    if (!page) {
      const rows = await model.findMany(args);
      return { rows: rows.map(map), total: rows.length };
    }

    const [rows, total] = await this.db.$transaction([
      model.findMany({ ...args, ...toSkipTake(page) }),
      model.count({ where: args['where'] }),
    ] as any);

    return { rows: (rows as any[]).map(map), total: total as unknown as number };
  }

  // Returns EPs assigned to a specific member, server-side filtered
  async findByOwner(
    ownerId: string,
    filters?: EpFilters,
    page?: PageRequest,
  ): Promise<{ rows: Ep[]; total: number }> {
    /*
      Prisma drops a condition whose value is undefined, so `{ ownerId:
      undefined }` does not match nobody — it matches everybody, and this
      method would hand one member the entire department's pipeline. The only
      caller supplies an id straight off a verified token, so this cannot fire
      today; it is here because the failure is silent, total, and a
      one-character typo away.
    */
    if (!ownerId) throw new Error('findByOwner called without an owner id');

    return this.paginate(
      this.db.ep,
      {
        where: { ownerId, ...this.buildWhere(filters) },
        orderBy: { assignedAt: 'desc' },
      },
      page,
      (r) => this.toEpEntity(r),
    );
  }

  // Returns EPs assigned to any of the given members (TL-scoped view)
  // Returns an empty page immediately when ownerIds is empty (no DB hit)
  async findByOwners(
    ownerIds: string[],
    filters?: EpFilters,
    page?: PageRequest,
  ): Promise<{ rows: Ep[]; total: number }> {
    if (ownerIds.length === 0) return { rows: [], total: 0 };

    return this.paginate(
      this.db.ep,
      {
        where: { ownerId: { in: ownerIds }, ...this.buildWhere(filters) },
        orderBy: { assignedAt: 'desc' },
      },
      page,
      (r) => this.toEpEntity(r),
    );
  }

  // Returns EPs for a department, optionally filtered
  async findByDepartment(
    departmentId: string,
    filters?: EpFilters,
    page?: PageRequest,
  ): Promise<{ rows: Ep[]; total: number }> {
    return this.paginate(
      this.db.ep,
      {
        where: { departmentId, ...this.buildWhere(filters) },
        orderBy: { createdAtExpa: 'desc' },
      },
      page,
      (r) => this.toEpEntity(r),
    );
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
    page?: PageRequest,
  ): Promise<{ rows: EpWithDetail[]; total: number }> {
    const statusFilter = filters.status
      ? Array.isArray(filters.status)
        ? { in: filters.status }
        : filters.status
      : undefined;

    const where = {
        departmentId,
        ...(filters.product    && { product: filters.product as unknown as any }),
        ...(statusFilter       && { statusOnExpa: statusFilter }),
        ...(filters.university && { university: universityWhere(filters.university) }),
        ...(filters.fieldOfStudy && { fieldOfStudy: filters.fieldOfStudy }),
        ...(filters.yearOfStudy !== undefined && { yearOfStudy: filters.yearOfStudy }),
        ...(filters.search && {
          fullName: { contains: filters.search, mode: 'insensitive' as const },
        }),
        ...dateRangeWhere(filters.createdFrom, filters.createdTo),

          ...(filters.hostingMC || filters.hostingLC
          ? {
              approvedDetail: {
                ...(filters.hostingMC && { hostingMC: filters.hostingMC }),
                ...(filters.hostingLC && { hostingLC: filters.hostingLC }),
              },
            }
          : {}),
        ...(filters.unassignedOnly && { ownerId: null }),
    };

    return this.paginate(
      this.db.ep,
      {
        where,
        include: {
          approvedDetail: true,
          owner: { select: { fullName: true } },
        },
        orderBy: { createdAtExpa: 'desc' },
      },
      page,
      (r) => ({
        ep: this.toEpEntity(r),
        approvedDetail: r.approvedDetail ? this.toApprovedDetailEntity(r.approvedDetail) : null,
        memberName: r.owner?.fullName ?? null,
      }),
    );
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

    /*
      ApprovedDetail is pinned on both sides: one per EP (epId unique) and one
      per EXPA application (expaAppId unique). A detail can therefore collide
      two ways — with another application on the same EP, or with the same
      application sitting on a different EP, which the old wrong-programme-code
      sync left plenty of.

      Resolving that per row meant two round-trips each, and several hundred
      serial round-trips to a remote database overran the serverless request
      limit. So the conflicts are cleared in two bulk queries first, which
      leaves the writes independent and safe to run concurrently.
    */
    const appIds = details.map((d) => d.expaAppId);
    const intended = new Map(details.map((d) => [d.expaAppId, d.epId]));

    // Any detail holding one of our applications against a different EP.
    const clashes = await this.db.approvedDetail.findMany({
      where: { expaAppId: { in: appIds } },
      select: { id: true, expaAppId: true, epId: true },
    });

    const stale = clashes
      .filter((c) => intended.get(c.expaAppId) !== c.epId)
      .map((c) => c.id);

    if (stale.length > 0) {
      await this.db.approvedDetail.deleteMany({ where: { id: { in: stale } } });
    }

    /*
      Capped rather than a bare Promise.all: the connection pool is small and
      flooding it is how this started timing out in the first place.
    */
    const CONCURRENCY = 20;

    for (let i = 0; i < details.length; i += CONCURRENCY) {
      await Promise.all(
        details.slice(i, i + CONCURRENCY).map((d) => {
          const fields = {
            expaAppId: d.expaAppId,
            opportunityTitle: d.opportunityTitle,
            hostingMC: d.hostingMC,
            hostingLC: d.hostingLC,
            projectFees: d.projectFees,
            approvalDate: d.approvalDate,
            realizedDate: d.realizedDate,
            completedDate: d.completedDate,
            finishedDate: d.finishedDate,
          };

          return this.db.approvedDetail.upsert({
            where: { epId: d.epId },
            update: fields,
            create: { id: d.id, epId: d.epId, ...fields },
          });
        }),
      );
    }
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
      ...(filters.university     && { university: universityWhere(filters.university) }),
      ...(filters.fieldOfStudy   && { fieldOfStudy: filters.fieldOfStudy }),
      ...(filters.yearOfStudy !== undefined && { yearOfStudy: filters.yearOfStudy }),
      ...(filters.trackingPhase  && { trackingPhase: filters.trackingPhase as unknown as any }),
      ...(filters.duration       && { duration: filters.duration as unknown as any }),
      // Boolean filters: only applied when explicitly set (undefined = no constraint)
      ...(filters.contacted  !== undefined && { contacted:  filters.contacted }),
      ...(filters.interested !== undefined && { interested: filters.interested }),
      // Partial, case-insensitive fullName search
      ...(filters.search && {
        fullName: { contains: filters.search, mode: 'insensitive' as const },
      }),
      ...dateRangeWhere(filters.createdFrom, filters.createdTo),
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
      row.addedManually,
      row.expaId,
    );
  }

  private toDbData(ep: Ep) {
    return {
      expaId: ep.expaId,
      fullName: ep.fullName,
      email: ep.email,
      phone: ep.phone,
      university: ep.university,
      fieldOfStudy: ep.fieldOfStudy,
      // Both only ever come from the sign-up sheet. Omitting them here meant a
      // lead created from the sheet lost its year and referral on insert.
      yearOfStudy: ep.yearOfStudy,
      source: ep.source,
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