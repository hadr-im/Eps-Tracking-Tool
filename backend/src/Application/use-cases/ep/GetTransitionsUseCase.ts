import { CallerContext } from './GetApprovedEpsUseCase';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../Infrastructure/Database/PrismaService';

export class GetTransitionsUseCase {
  constructor(private readonly db: PrismaClient = prisma) {}

  async execute(caller: CallerContext) {
    if (!caller.departmentId) {
      throw new Error('User has no department assigned');
    }

    // Fetch transitions where the department is either the source or destination
    const transitions = await this.db.transitionHistory.findMany({
      where: {
        OR: [
          { fromDepartment: caller.departmentId },
          { toDepartment: caller.departmentId },
        ],
      },
      include: {
        ep: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            university: true,
            fieldOfStudy: true,
          },
        },
        triggeredBy: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transitions.map((t) => ({
      id: t.id,
      epId: t.epId,
      epName: t.ep?.fullName ?? 'Unknown',
      epEmail: t.ep?.email ?? null,
      epPhone: t.ep?.phone ?? null,
      epUniversity: t.ep?.university ?? null,
      epFieldOfStudy: t.ep?.fieldOfStudy ?? null,
      triggeredByName: t.triggeredBy?.fullName ?? 'System',
      fromProduct: t.fromProduct,
      toProduct: t.toProduct,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
      direction: t.fromDepartment === caller.departmentId ? 'OUTBOUND' : 'INBOUND',
    }));
  }
}
