import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { UserRole } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';

export interface AccessRequest {
  role: UserRole;
  departmentId: string;
  teamLeaderId: string | null;
  isDispatcher: boolean;
}

/*
  Shared validation for an organisational placement — the role, department,
  team leader and dispatcher flag that a user asks for at signup and that a VP
  confirms at approval.

  Runs in BOTH places on purpose. At signup it exists to give immediate,
  friendly feedback ("Ahmed is already the dispatcher for GV"). At approval it
  runs again because the world may have changed in between: someone else may
  have been approved as that department's VP while this request sat in the
  queue. Approval is the authoritative check, and the partial unique indexes in
  the database are the final backstop underneath both.
*/
export class AccessRequestValidator {
  constructor(private readonly repo: IAuthRepository) {}

  /*
    @param access       The placement being requested or granted
    @param excludeUserId  Account to ignore when looking for conflicts, so that
                          re-approving someone does not collide with themselves
  */
  async validate(access: AccessRequest, excludeUserId?: string): Promise<void> {
    if (!Object.values(UserRole).includes(access.role)) {
      throw new AppError('Select a valid position', 400);
    }

    if (!(await this.repo.departmentExists(access.departmentId))) {
      throw new AppError('That department does not exist', 400);
    }

    switch (access.role) {
      case UserRole.VP:
        await this.assertNoExistingVp(access.departmentId, excludeUserId);
        if (access.isDispatcher) {
          throw new AppError('The dispatcher must be a Team Leader, not a VP', 400);
        }
        if (access.teamLeaderId) {
          throw new AppError('A VP is not assigned to a Team Leader', 400);
        }
        break;

      case UserRole.TEAM_LEADER:
        if (access.isDispatcher) {
          await this.assertNoExistingDispatcher(access.departmentId, excludeUserId);
        }
        if (access.teamLeaderId) {
          throw new AppError('A Team Leader is not assigned to another Team Leader', 400);
        }
        break;

      case UserRole.MEMBER:
        if (access.isDispatcher) {
          throw new AppError('Only a Team Leader can be the dispatcher', 400);
        }
        // Null is allowed: the member does not know their TL yet, and the
        // approving VP fills it in.
        if (access.teamLeaderId) {
          await this.assertValidTeamLeader(access.teamLeaderId, access.departmentId);
        }
        break;
    }
  }

  // Private checks

  private async assertNoExistingVp(departmentId: string, excludeUserId?: string): Promise<void> {
    const existing = await this.repo.findActiveVp(departmentId);
    if (existing && existing.id !== excludeUserId) {
      throw new AppError(
        `This department already has a VP (${existing.fullName}). There can only be one.`,
        409,
      );
    }
  }

  private async assertNoExistingDispatcher(
    departmentId: string,
    excludeUserId?: string,
  ): Promise<void> {
    const existing = await this.repo.findActiveDispatcher(departmentId);
    if (existing && existing.id !== excludeUserId) {
      throw new AppError(
        `${existing.fullName} is already the dispatcher for this department. There can only be one.`,
        409,
      );
    }
  }

  private async assertValidTeamLeader(teamLeaderId: string, departmentId: string): Promise<void> {
    const tl = await this.repo.findById(teamLeaderId);
    if (!tl || tl.isDisabled || tl.role !== UserRole.TEAM_LEADER) {
      throw new AppError('That Team Leader was not found', 400);
    }
    if (tl.departmentId !== departmentId) {
      throw new AppError('That Team Leader belongs to a different department', 400);
    }
  }
}
