import { IEpRepository, EpWithDetail } from '../../../Domain/abstracts/IEpRepository';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { EpFilters } from './EpFilters';
import { CallerContext } from './GetApprovedEpsUseCase';
import { UserRole } from '../../../Domain/enums/UserRole';
import { EpDetailDto } from './GetApprovedEpsWithDetailUseCase';
import { AppError } from '../../errors/AppError';

/*
  Returns all REALIZED EPs for the caller's department with ApprovedDetail joined
*/
export class GetRealisedEpsUseCase {
  constructor(private readonly epRepo: IEpRepository) {}

  async execute(caller: CallerContext, requestedDepartmentId?: string, filters: EpFilters = {}): Promise<EpDetailDto[]> {
    const departmentId = this.resolveDepartmentId(caller, requestedDepartmentId);

    const mergedFilters: EpFilters = {
      ...filters,
      status: EpStatus.REALIZED,
    };

    const rows = await this.epRepo.findByDepartmentFiltered(departmentId, mergedFilters);
    return rows.map((r) => this.toDto(r));
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

  private toDto({ ep, approvedDetail, memberName }: EpWithDetail): EpDetailDto {
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
      ownerId: ep.ownerId,
      memberName: memberName ?? null,
      approvedDetail: approvedDetail
        ? {
            expaAppId: approvedDetail.expaAppId,
            opportunityTitle: approvedDetail.opportunityTitle,
            hostingMC: approvedDetail.hostingMC,
            hostingLC: approvedDetail.hostingLC,
            projectFees: approvedDetail.projectFees,
            approvalDate: approvedDetail.approvalDate?.toISOString() ?? null,
            realizedDate: approvedDetail.realizedDate?.toISOString() ?? null,
            completedDate: approvedDetail.completedDate?.toISOString() ?? null,
            finishedDate: approvedDetail.finishedDate?.toISOString() ?? null,
            contractLink: approvedDetail.contractLink,
            auditFolder: approvedDetail.auditFolder,
          }
        : null,
    };
  }
}
