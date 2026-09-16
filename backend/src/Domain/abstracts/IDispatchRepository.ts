import { Ep } from '../entities/Ep';
import { User } from '../entities/User';
import { DispatchFilters } from '../../Application/use-cases/dispatch/DispatchFilters';

export interface IDispatchRepository {
  /*
   Returns EPs in the pool: ownerId = null, belonging to departmentId
   */
  getUnassignedLeads(departmentId: string, filters?: DispatchFilters): Promise<Ep[]>;

  /*
   Assigns EPs to a member
   Sets ownerId = memberId and stamps assignedAt = now() on the server
   Returns the updated EP entities
   */
  assignEpsToMember(epIds: string[], memberId: string): Promise<Ep[]>;

  /*
   Returns all active (non-disabled) members of a department for the dispatch dropdown.
   When teamLeaderId is supplied, results are further scoped to members assigned to that TL.
   */
  getDepartmentMembers(departmentId: string, teamLeaderId?: string): Promise<User[]>;
}
