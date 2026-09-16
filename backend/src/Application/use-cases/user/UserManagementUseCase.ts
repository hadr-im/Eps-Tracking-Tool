import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { User } from '../../../Domain/entities/User';
import { UserRole } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';

// Minimal caller shape needed by this use case
export interface UserManagementCaller {
  id: string;
  role: UserRole;
  departmentId: string | null;
}

export class UserManagementUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  /*
    Assigns (or unassigns) a member to a Team Leader

    Permission rules:
      - Caller must be TEAM_LEADER or VP
      - Target (memberId) must exist, be MEMBER role, and not be disabled
      - If caller is TEAM_LEADER: member and new TL must be in same department
      - teamLeaderId must refer to an existing active TEAM_LEADER (unless null to unassign)
  */
  async assignTeamLeader(
    memberId: string,
    teamLeaderId: string | null,
    caller: UserManagementCaller,
  ): Promise<User> {
    if (caller.role !== UserRole.TEAM_LEADER && caller.role !== UserRole.VP) {
      throw new AppError('Only a Team Leader or VP can assign members', 403);
    }

    // Validate target member
    const member = await this.authRepo.findById(memberId);
    if (!member || member.isDisabled) {
      throw new AppError('Member not found', 404);
    }
    if (member.role !== UserRole.MEMBER) {
      throw new AppError('Target user is not a Member', 400);
    }

    // TL callers are scoped to their own department
    if (caller.role === UserRole.TEAM_LEADER) {
      if (!caller.departmentId) {
        throw new AppError('No department assigned to your account', 400);
      }
      if (member.departmentId !== caller.departmentId) {
        throw new AppError('Member does not belong to your department', 403);
      }
    }

    // Validate the new Team Leader (skip when unassigning)
    if (teamLeaderId !== null) {
      const tl = await this.authRepo.findById(teamLeaderId);
      if (!tl || tl.isDisabled) {
        throw new AppError('Team Leader not found', 404);
      }
      if (tl.role !== UserRole.TEAM_LEADER) {
        throw new AppError('Target user is not a Team Leader', 400);
      }
      if (tl.departmentId !== member.departmentId) {
        throw new AppError(
          'Team Leader and Member must belong to the same department',
          400,
        );
      }
    }

    return this.authRepo.assignTeamLeader(memberId, teamLeaderId);
  }

  /*
    Returns all active members assigned to the given Team Leader
    Used by EpController to scope team EP queries for TL callers
  */
  async getMembersByTeamLeader(teamLeaderId: string): Promise<User[]> {
    return this.authRepo.findMembersByTeamLeader(teamLeaderId);
  }
}