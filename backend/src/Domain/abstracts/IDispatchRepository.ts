import { Ep } from '../entities/Ep';
import { User } from '../entities/User';
import { DispatchFilters } from '../../Application/use-cases/dispatch/DispatchFilters';

export interface IDispatchRepository {
  /*
   Returns EPs in the pool: ownerId = null, belonging to departmentId.
   Excludes manually added leads, which have their own page.
   */
  getUnassignedLeads(departmentId: string, filters?: DispatchFilters): Promise<Ep[]>;

  /*
   The manual counterpart of getUnassignedLeads: EPs entered by hand that are
   still waiting to be assigned to a member.
   */
  getManualLeads(departmentId: string, filters?: DispatchFilters): Promise<Ep[]>;

  /*
   Persists a hand-entered lead. Rejects an id that already exists so adding
   the same EXPA person twice cannot silently overwrite CRM work.
   */
  createManualLead(ep: Ep): Promise<Ep>;

  /*
   Whether this EXPA person already has a lead in this department. Scoped to
   the department on purpose: the same person may legitimately be a lead for
   two departments when they chose two internship types.
  */
  existsInDepartment(expaId: string, departmentId: string): Promise<boolean>;

  // Whether a row id is taken, so a second copy knows to generate its own.
  idExists(id: string): Promise<boolean>;

  /*
   Assigns EPs to a member
   Sets ownerId = memberId and stamps assignedAt = now() on the server
   Returns the updated EP entities
   */
  assignEpsToMember(epIds: string[], memberId: string, dispatcherId: string): Promise<Ep[]>;

  /*
   Returns all active (non-disabled) members of a department for the dispatch dropdown.
   When teamLeaderId is supplied, results are further scoped to members assigned to that TL.
   */
  getDepartmentMembers(departmentId: string, teamLeaderId?: string): Promise<User[]>;
}
