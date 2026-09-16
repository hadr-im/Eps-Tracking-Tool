import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { EpFilters } from './EpFilters';
import { CallerContext } from './GetApprovedEpsUseCase';
import { UserRole } from '../../../Domain/enums/UserRole';

/*
  DTO for the Leads list does not include ApprovedDetail since leads have not yet been approved
*/
export interface LeadDto {
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
  Returns all LEAD EPs (status = LEAD, CONTACTED, INTERESTED) for the caller's department
*/
export class GetLeadsUseCase {
  constructor(private readonly epRepo: IEpRepository) {}

  async execute(caller: CallerContext, requestedDepartmentId?: string, filters: EpFilters = {}): Promise<LeadDto[]> {
    const departmentId = this.resolveDepartmentId(caller, requestedDepartmentId);

    const leadStatuses: EpStatus[] = [
      EpStatus.LEAD,
      EpStatus.CONTACTED,
      EpStatus.INTERESTED,
    ];

    const mergedFilters: EpFilters = {
      ...filters,
      status: leadStatuses,
      unassignedOnly: true,
    };

    const rows = await this.epRepo.findByDepartmentFiltered(departmentId, mergedFilters);

    return rows.map(({ ep }) => ({
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
    }));
  }

  private resolveDepartmentId(caller: CallerContext, requestedDepartmentId?: string): string {
    if (caller.role === UserRole.VP && requestedDepartmentId) {
      return requestedDepartmentId;
    }
    if (!caller.departmentId) throw new Error('User has no department assigned');
    return caller.departmentId;
  }
}
