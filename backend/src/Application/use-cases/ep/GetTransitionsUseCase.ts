import { CallerContext } from './GetApprovedEpsUseCase';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../Infrastructure/Database/PrismaService';

export class GetTransitionsUseCase {
  constructor(private readonly db: PrismaClient = prisma) {}

  async execute(caller: CallerContext) {
    if (!caller.departmentId) {
      throw new Error('User has no department assigned');
    }

    // Inbound only: EPs transitioned INTO the caller's department. An EP that
    // left is now another department's to work, and showing it here made the
    // page read as a log rather than a list of EPs you have been handed.
    const transitions = await this.db.transitionHistory.findMany({
      where: { toDepartment: caller.departmentId },
      include: {
        ep: {
          include: {
            owner: { select: { fullName: true } },
          },
        },
        triggeredBy: {
          select: { fullName: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transitions.map((t) => {
      const ep = t.ep;
      
      // Full EP DTO inline
      const epDto = ep ? {
        id: ep.id,
        expaId: ep.expaId,
        fullName: ep.fullName,
        email: ep.email,
        phone: ep.phone,
        university: ep.university,
        fieldOfStudy: ep.fieldOfStudy,
        yearOfStudy: ep.yearOfStudy,
        product: ep.product,
        departmentId: ep.departmentId,
        ownerId: ep.ownerId,
        assignedAt: ep.assignedAt?.toISOString() ?? null,
        statusOnExpa: ep.statusOnExpa,
        source: ep.source,
        cvLink: ep.cvLink,
        contacted: ep.contacted,
        contactedAt: ep.contactedAt?.toISOString() ?? null,
        interested: ep.interested,
        trackingPhase: ep.trackingPhase,
        notes: ep.notes,
        duration: ep.duration,
        availability: ep.availability,
        createdAtExpa: ep.createdAtExpa.toISOString(),
        syncedAt: ep.syncedAt.toISOString(),
      } : null;

      return {
        id: t.id,
        ep: epDto,
        memberName: ep?.owner?.fullName ?? null,
        
        // Transition-specific fields
        triggeredByName: t.triggeredBy?.fullName ?? 'System',
        fromProduct: t.fromProduct,
        toProduct: t.toProduct,
        note: t.note,
        createdAt: t.createdAt.toISOString(),
        direction: t.fromDepartment === caller.departmentId ? 'OUTBOUND' : 'INBOUND',
      };
    });
  }
}
