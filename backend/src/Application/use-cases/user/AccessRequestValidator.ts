import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { UserRole, canSwitchDepartment } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';

export interface AccessRequest {
  role: UserRole;
  // Null for the LC-wide roles (LCP, ADMIN), which belong to no single department.
  departmentId: string | null;
  teamLeaderId: string | null;
}

/*
  Shared validation for an organisational placement — the role, department and
  team leader that a user asks for at signup and that a VP confirms at
  approval.

  Runs in BOTH places on purpose. At signup it exists to give immediate,
  friendly feedback ("GV already has a VP"). At approval it runs again because
  the world may have changed in between: someone else may have been approved as
  that department's VP while this request sat in the queue. Approval is the
  authoritative check, and the partial unique indexes in the database are the
  final backstop underneath both.
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

    /*
      A department-bound role must name a department. The LC-wide roles
      oversee all of them, so there is nothing to name here — they start in
      Global Volunteer and switch whenever they like.
    */
    if (!canSwitchDepartment(access.role)) {
      if (!access.departmentId) {
        throw new AppError('Select a department', 400);
      }
      if (!(await this.repo.departmentExists(access.departmentId))) {
        throw new AppError('That department does not exist', 400);
      }
    }

    switch (access.role) {
      case UserRole.VP:
        await this.assertNoExistingVp(access.departmentId!, excludeUserId);
        if (access.teamLeaderId) {
          throw new AppError('A VP is not assigned to a Team Leader', 400);
        }
        break;

      /*
        Neither is checked against assertNoExistingVp: they sit above the VPs
        rather than in place of one, so a department can hold both. The
        departmentId they carry is whichever one they are supervising at the
        moment, not a post they occupy.
      */
      case UserRole.LCP:
      case UserRole.ADMIN: {
        const label = access.role === UserRole.ADMIN ? 'An admin' : 'An LCP';
        /*
          One per installation, the LC-wide equivalent of one VP per
          department. The setup code alone is not enough: whoever holds it
          could otherwise mint a second holder at will, and the two would have
          equal authority with no way to tell which was intended.
        */
        await this.assertRoleUnheld(access.role, label, excludeUserId);
        if (access.teamLeaderId) {
          throw new AppError(`${label} is not assigned to a Team Leader`, 400);
        }
        if (access.departmentId) {
          throw new AppError(`${label} is not tied to a department`, 400);
        }
        break;
      }

      case UserRole.TEAM_LEADER:
        if (access.teamLeaderId) {
          throw new AppError('A Team Leader is not assigned to another Team Leader', 400);
        }
        break;

      case UserRole.MEMBER:
        // Null is allowed: the member does not know their TL yet, and the
        // approving VP fills it in.
        if (access.teamLeaderId) {
          await this.assertValidTeamLeader(access.teamLeaderId, access.departmentId!);
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


  private async assertRoleUnheld(
    role: UserRole,
    label: string,
    excludeUserId?: string,
  ): Promise<void> {
    const existing = await this.repo.findActiveByRole(role);
    if (existing && existing.id !== excludeUserId) {
      throw new AppError(
        `${label} already exists (${existing.fullName}). There can only be one.`,
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
