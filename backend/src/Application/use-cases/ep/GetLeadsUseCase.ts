import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { EpFilters } from './EpFilters';
import { PageRequest, Paginated, toPaginated } from './Pagination';
import { CallerContext } from './GetApprovedEpsUseCase';
import { UserRole } from '../../../Domain/enums/UserRole';

/*
  DTO for the Leads list does not include ApprovedDetail since leads have not yet been approved
*/
export interface LeadDto {
  id: string;
  // EXPA person id shown in the UI; see EpDto.expaId.
  expaId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  // Both come from the sign-up sheet — EXPA knows neither.
  yearOfStudy: number | null;
  source: string | null;
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

  async execute(
    caller: CallerContext,
    requestedDepartmentId?: string,
    filters: EpFilters = {},
    page?: PageRequest,
  ): Promise<Paginated<LeadDto>> {
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

    const { rows, total } = await this.epRepo.findByDepartmentFiltered(
      departmentId,
      mergedFilters,
      page,
    );

    const data = rows.map(({ ep }) => ({
      id: ep.id,
      expaId: ep.expaId,
      fullName: ep.fullName,
      email: ep.email,
      phone: ep.phone,
      university: ep.university,
      fieldOfStudy: ep.fieldOfStudy,
      yearOfStudy: ep.yearOfStudy,
      source: ep.source,
      product: ep.product,
      statusOnExpa: ep.statusOnExpa,
      createdAtExpa: ep.createdAtExpa.toISOString(),
      syncedAt: ep.syncedAt.toISOString(),
    }));

    return toPaginated(data, total, page);
  }

  private resolveDepartmentId(caller: CallerContext, requestedDepartmentId?: string): string {
    if (caller.role === UserRole.VP && requestedDepartmentId) {
      return requestedDepartmentId;
    }
    if (!caller.departmentId) throw new Error('User has no department assigned');
    return caller.departmentId;
  }
}
