import { IDispatchRepository } from '../../../Domain/abstracts/IDispatchRepository';
import { Ep } from '../../../Domain/entities/Ep';
import { User } from '../../../Domain/entities/User';
import { UserRole } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';
import { DispatchFilters } from './DispatchFilters';

// Minimal shape the use case needs from the authenticated caller
export interface CallerContext {
  id: string;
  role: UserRole;
  departmentId: string | null;
  isDispatcher: boolean;
}

export class DispatchUseCase {
  constructor(private readonly dispatchRepo: IDispatchRepository) {}

  // Returns EPs that haven't been assigned yet (server-side filtered)
  async getLeadsPool(departmentId: string, filters?: DispatchFilters): Promise<Ep[]> {
    return this.dispatchRepo.getUnassignedLeads(departmentId, filters);
  }

  /*
    Dispatches a batch of EPs to a member

    Permission rules:
      - Caller must be a TEAM_LEADER with isDispatcher = true
      - Target member must belong to the same department as the dispatcher
      - Target member must be assigned to this dispatcher TL (teamLeaderId === dispatcher.id)

    Auto-dates:
      - assignedAt is stamped by the SERVER, never trusted from the client
  */
  async dispatch(
    epIds: string[],
    memberId: string,
    dispatcher: CallerContext,
    members: User[],
  ): Promise<Ep[]> {
    if (dispatcher.role !== UserRole.TEAM_LEADER || !dispatcher.isDispatcher) {
      throw new AppError('Only a dispatcher Team Leader can assign leads', 403);
    }

    if (epIds.length === 0) {
      throw new AppError('At least one EP must be selected', 400);
    }

    // Target member must be in the same department
    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) {
      throw new AppError('Member not found in your department', 404);
    }
    if (targetMember.departmentId !== dispatcher.departmentId) {
      throw new AppError('Member does not belong to your department', 403);
    }

    // Target member must be assigned to this dispatcher TL
    if (targetMember.teamLeaderId !== dispatcher.id) {
      throw new AppError('Member is not assigned to you', 403);
    }

    return this.dispatchRepo.assignEpsToMember(epIds, memberId, dispatcher.id);
  }

  /*
    Returns members of a department
    When teamLeaderId is supplied, results are scoped to that TL's members
    Pass undefined to get all department members (VP view)11
  */
  async getDepartmentMembers(departmentId: string, teamLeaderId?: string): Promise<User[]> {
    return this.dispatchRepo.getDepartmentMembers(departmentId, teamLeaderId);
  }
}
