import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { Ep } from '../../../Domain/entities/Ep';
import { UserRole } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';

// Caller identity passed in by the controller (from JWT payload via req.user)
export interface CallerContext {
  role: UserRole;
  departmentId: string | null;
}

// Shape returned to the Presentation layer
export interface ApprovedEpDto {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  product: string;
  statusOnExpa: string;
  createdAtExpa: string;
  syncedAt: string;
}

/*
  Returns all EPs at or beyond APPROVED status for a given department

  Authorization rules (enforced here so the Presentation layer stays thin):
    VP: may request any department by providing a 'departmentId' query param or omit it to get their own
    TEAM_LEADER / MEMBER: always scoped to their own departmentId from the JWT
  Throws if the resolved departmentId is still null (user has no department assigned)
*/
export class GetApprovedEpsUseCase {
  constructor(private readonly epRepo: IEpRepository) {}

  async execute(
    caller: CallerContext,
    requestedDepartmentId?: string,
  ): Promise<ApprovedEpDto[]> {
    const departmentId = this.resolveDepartmentId(caller, requestedDepartmentId);

    const eps = await this.epRepo.findApprovedByDepartment(departmentId);

    return eps.map((ep) => this.toDto(ep));
  }

  /*
    Resolves which department to read.

    A departmentId from the query string may only ever name the caller's own
    department. This previously returned any value a VP supplied, which would
    have handed back another department's EPs to anyone who asked; the UI never
    sent it, so it was an open door nobody walked through.
  */
  private resolveDepartmentId(caller: CallerContext, requestedDepartmentId?: string): string {
    const departmentId = caller.departmentId;
    if (!departmentId) {
      throw new AppError('No department assigned to your account', 400);
    }

    if (requestedDepartmentId && requestedDepartmentId !== departmentId) {
      throw new AppError('You can only view your own department', 403);
    }

    return departmentId;
  }

  private toDto(ep: Ep): ApprovedEpDto {
    return {
      id: ep.id,
      fullName: ep.fullName,
      email: ep.email,
      phone: ep.phone,
      university: ep.university,
      fieldOfStudy: ep.fieldOfStudy,
      product: ep.product,
      statusOnExpa: ep.statusOnExpa,
      createdAtExpa: ep.createdAtExpa.toISOString(),
      syncedAt: ep.syncedAt.toISOString(),
    };
  }
}
