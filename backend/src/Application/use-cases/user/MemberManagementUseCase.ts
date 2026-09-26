import { IAuthRepository, ManagedAccess } from '../../../Domain/abstracts/IAuthRepository';
import { UserRole } from '../../../Domain/enums/UserRole';
import { AccountStatus } from '../../../Domain/enums/AccountStatus';
import { UserMapper, UserResponse } from '../../mappers/UserMapper';
import { AppError } from '../../errors/AppError';
import { AccessRequestValidator } from './AccessRequestValidator';

export interface MemberManagementCaller {
  id: string;
  role: UserRole;
  departmentId: string | null;
}

// Every field is optional: omitting one leaves that part of the access alone.
export interface AccessChanges {
  role?: UserRole;
  teamLeaderId?: string | null;
  isDispatcher?: boolean;
  isDisabled?: boolean;
}

/*
  Managing people after they have been approved.

  Signup and approval only cover the day someone joins. Roles move constantly
  in an LC — members become Team Leaders, the dispatcher hands over, members
  switch teams, people leave at the end of a term. Without this, the only way
  to change any of that is editing the database by hand.
*/
export class MemberManagementUseCase {
  private readonly validator: AccessRequestValidator;

  constructor(private readonly repo: IAuthRepository) {
    this.validator = new AccessRequestValidator(repo);
  }

  // Everyone approved into the caller's department, disabled accounts included.
  async listMembers(caller: MemberManagementCaller): Promise<UserResponse[]> {
    const departmentId = this.assertVp(caller);
    const users = await this.repo.findDepartmentUsers(departmentId);
    return users.map((u) => UserMapper.toResponse(u));
  }

  /*
    Applies a role / team / dispatcher / enabled change.

    Runs through the same validator as approval, so the one-dispatcher and
    one-VP rules hold here too — handing the dispatcher role to a second Team
    Leader is refused, and the database indexes back that up.
  */
  async updateAccess(
    userId: string,
    changes: AccessChanges,
    caller: MemberManagementCaller,
  ): Promise<UserResponse> {
    const departmentId = this.assertVp(caller);

    /*
      A VP cannot edit their own access. Demoting or disabling yourself would
      leave the department with no VP and nobody able to appoint one — the same
      deadlock the setup code exists to avoid.
    */
    if (userId === caller.id) {
      throw new AppError('You cannot change your own access', 403);
    }

    const user = await this.repo.findById(userId);
    if (!user) throw new AppError('Member not found', 404);

    if (user.status !== AccountStatus.ACTIVE) {
      throw new AppError('This account has not been approved yet', 409);
    }
    if (user.departmentId !== departmentId) {
      throw new AppError('That member is not in your department', 403);
    }
    if (user.role === UserRole.VP) {
      throw new AppError('A VP account cannot be changed here', 403);
    }
    if (changes.role === UserRole.VP) {
      throw new AppError(
        'A member cannot be promoted to VP here. The incoming VP signs up with the VP setup code.',
        400,
      );
    }

    const next: ManagedAccess = {
      role: changes.role ?? user.role,
      teamLeaderId:
        changes.teamLeaderId !== undefined ? changes.teamLeaderId : user.teamLeaderId,
      isDispatcher: changes.isDispatcher ?? user.isDispatcher,
      isDisabled: changes.isDisabled ?? user.isDisabled,
    };

    // Same normalisation as approval: a Member holds no dispatcher flag, a
    // Team Leader reports to nobody.
    if (next.role !== UserRole.TEAM_LEADER) next.isDispatcher = false;
    if (next.role !== UserRole.MEMBER) next.teamLeaderId = null;

    /*
      A disabled account holds no slot, so the uniqueness rules do not apply to
      it — that is what lets a departing dispatcher be switched off and their
      replacement appointed.
    */
    if (!next.isDisabled) {
      await this.validator.validate(
        {
          role: next.role,
          departmentId,
          teamLeaderId: next.teamLeaderId,
          isDispatcher: next.isDispatcher,
        },
        userId,
      );
    }

    try {
      const updated = await this.repo.updateUserAccess(userId, next);
      return UserMapper.toResponse(updated);
    } catch (err) {
      throw this.translateUniqueViolation(err);
    }
  }

  // Private helpers

  private assertVp(caller: MemberManagementCaller): string {
    if (caller.role !== UserRole.VP) {
      throw new AppError('Only a VP can manage members', 403);
    }
    if (!caller.departmentId) {
      throw new AppError('No department assigned to your account', 400);
    }
    return caller.departmentId;
  }

  private translateUniqueViolation(err: unknown): unknown {
    const code = (err as { code?: string })?.code;
    if (code !== 'P2002') return err;

    const target = String((err as { meta?: { target?: unknown } })?.meta?.target ?? '');
    if (target.includes('dispatcher')) {
      return new AppError('This department already has a dispatcher.', 409);
    }
    if (target.includes('vp')) {
      return new AppError('This department already has a VP.', 409);
    }
    return err;
  }
}
