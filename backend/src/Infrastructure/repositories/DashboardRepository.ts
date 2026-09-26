import { PrismaClient } from '@prisma/client';
import {
  IDashboardRepository,
  DashboardScope,
  StatusCount,
  PhaseCount,
  MemberBreakdown,
  StatusChangeTrend,
  TransitionStat,
} from '../../Domain/abstracts/IDashboardRepository';
import { prisma } from '../Database/PrismaService';

export class DashboardRepository implements IDashboardRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  async getStatusCounts(scope: DashboardScope): Promise<StatusCount[]> {
    const rows = await this.db.ep.groupBy({
      by: ['statusOnExpa'],
      where: {
        ...(scope.departmentId ? { departmentId: scope.departmentId } : {}),
        ...(scope.ownerId ? { ownerId: scope.ownerId } : {}),
      },
      _count: { id: true },
    });

    return rows.map((r) => ({
      status: r.statusOnExpa,
      count: r._count.id,
    }));
  }

  async getPhaseCounts(scope: DashboardScope): Promise<PhaseCount[]> {
    const rows = await this.db.ep.groupBy({
      by: ['trackingPhase'],
      where: {
        ...(scope.departmentId ? { departmentId: scope.departmentId } : {}),
        ...(scope.ownerId ? { ownerId: scope.ownerId } : {}),
        trackingPhase: { not: null },
      },
      _count: { id: true },
    });

    return rows.map((r) => ({
      phase: r.trackingPhase as string,
      count: r._count.id,
    }));
  }

  async getMemberBreakdown(
    departmentId: string,
    teamLeaderId?: string,
  ): Promise<MemberBreakdown[]> {
    // Because the dataset is huge, a single raw SQL query is used to conditionally count
    // directly in PostgreSQL, returning only the small set of final numbers
    //
    // The teamLeaderId predicate is written so that passing undefined matches
    // every member, keeping this to one query instead of two near-identical ones.
    const result = await this.db.$queryRaw`
      SELECT
        u.id AS "memberId",
        u."fullName" AS "fullName",
        COUNT(e.id)::int AS "totalAssigned",
        COUNT(e.id) FILTER (WHERE e.contacted = true)::int AS "contactedCount",
        COUNT(e.id) FILTER (WHERE e."statusOnExpa" IN ('APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED'))::int AS "approvedCount",
        COUNT(e.id) FILTER (WHERE e."statusOnExpa" IN ('REALIZED', 'COMPLETED', 'FINISHED'))::int AS "realisedCount"
      FROM "User" u
      LEFT JOIN "Ep" e ON e."ownerId" = u.id
      WHERE u."departmentId" = ${departmentId}
        AND u.role = 'MEMBER'
        AND u."isDisabled" = false
        AND (${teamLeaderId ?? null}::text IS NULL OR u."teamLeaderId" = ${teamLeaderId ?? null}::text)
      GROUP BY u.id, u."fullName"
      ORDER BY "approvedCount" DESC, "contactedCount" DESC
    `;

    return result as MemberBreakdown[];
  }

  async getStatusChangesOverTime(departmentId: string, since: Date): Promise<StatusChangeTrend[]> {
    // Groups history logs by the week they occurred in
    const result = await this.db.$queryRaw`
      SELECT 
        DATE_TRUNC('week', sh."changedAt")::text AS date,
        sh."toStatus"::text AS status,
        COUNT(sh.id)::int AS count
      FROM "StatusHistory" sh
      JOIN "Ep" e ON e.id = sh."epId"
      WHERE e."departmentId" = ${departmentId}
        AND sh."changedAt" >= ${since}
      GROUP BY DATE_TRUNC('week', sh."changedAt"), sh."toStatus"
      ORDER BY date ASC
    `;

    return result as StatusChangeTrend[];
  }

  async getTransitionStats(departmentId: string): Promise<TransitionStat[]> {
    const rows = await this.db.transitionHistory.groupBy({
      by: ['fromProduct', 'toProduct'],
      where: {
        toDepartment: departmentId,
        fromProduct: { not: null },
        toProduct: { not: null },
      },
      _count: { id: true },
    });

    return rows.map((r) => ({
      fromProduct: r.fromProduct as string,
      toProduct: r.toProduct as string,
      count: r._count.id,
    }));
  }
}
