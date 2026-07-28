import { IEpRepository, EpWithDetail } from '../../../Domain/abstracts/IEpRepository';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { EpFilters } from './EpFilters';
import { CallerContext } from './GetApprovedEpsUseCase';
import { UserRole } from '../../../Domain/enums/UserRole';

/*
  DTO shape returned for approved/realized/finished EPs
  Merges Ep fields with the joined ApprovedDetail 
*/
export interface EpDetailDto {
  // Core EP fields
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
  // ApprovedDetail fields (null if not yet created)
  approvedDetail: {
    expaAppId: string;
    opportunityTitle: string | null;
    hostingMC: string | null;
    hostingLC: string | null;
    projectFees: number | null;
    approvalDate: string | null;
    realizedDate: string | null;
    completedDate: string | null;
    finishedDate: string | null;
  } | null;
}


export class GetApprovedEpsWithDetailUseCase {
  constructor(private readonly epRepo: IEpRepository) {}

  async execute(caller: CallerContext, requestedDepartmentId?: string, filters: EpFilters = {}): Promise<EpDetailDto[]> {
    const departmentId = this.resolveDepartmentId(caller, requestedDepartmentId);

    const approvedStatuses: EpStatus[] = [
      EpStatus.APPROVED,
      EpStatus.REALIZED,
      EpStatus.COMPLETED,
      EpStatus.FINISHED,
    ];

    const mergedFilters: EpFilters = {
      ...filters,
      status: approvedStatuses,
    };

    const rows = await this.epRepo.findByDepartmentFiltered(departmentId, mergedFilters);
    return rows.map((r) => this.toDto(r));
  }

  private resolveDepartmentId(caller: CallerContext, requestedDepartmentId?: string): string {
    if (caller.role === UserRole.VP && requestedDepartmentId) {
      return requestedDepartmentId;
    }
    if (!caller.departmentId) throw new Error('User has no department assigned');
    return caller.departmentId;
  }

  private toDto({ ep, approvedDetail }: EpWithDetail): EpDetailDto {
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
          }
        : null,
    };
  }
}
