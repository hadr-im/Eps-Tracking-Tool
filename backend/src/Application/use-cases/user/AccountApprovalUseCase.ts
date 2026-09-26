import { IAuthRepository, GrantedAccess } from '../../../Domain/abstracts/IAuthRepository';
import { User } from '../../../Domain/entities/User';
import { UserRole } from '../../../Domain/enums/UserRole';
import { AccountStatus } from '../../../Domain/enums/AccountStatus';
import { UserMapper, UserResponse } from '../../mappers/UserMapper';
import { AppError } from '../../errors/AppError';
import { AccessRequestValidator } from './AccessRequestValidator';

export interface ApprovalCaller {
  id: string;
  role: UserRole;
  departmentId: string | null;
}

/*
  Corrections a VP may apply while approving. Anything omitted falls back to
  what the applicant requested, so the common case is a one-click approve.
*/
export interface ApprovalOverrides {
  role?: UserRole;
  departmentId?: string;
  teamLeaderId?: string | null;
  isDispatcher?: boolean;
}

/*
  The approval queue.

  This is the only place in the system where privileges are granted. Signup
  records what someone asked for; this decides what they actually get.
*/
export class AccountApprovalUseCase {
  private readonly validator: AccessRequestValidator;

  constructor(private readonly repo: IAuthRepository) {
    this.validator = new AccessRequestValidator(repo);
  }

  /*
    Signup requests in the caller's department, oldest first.

    Declined requests stay listable so a decision can be reversed — a VP who
    rejects the wrong person would otherwise have no way back, and the
    applicant cannot re-apply because their email is already taken.
  */
  async listRequests(
    caller: ApprovalCaller,
    status: AccountStatus = AccountStatus.PENDING,
  ): Promise<UserResponse[]> {
    const departmentId = this.assertVp(caller);

    if (status !== AccountStatus.PENDING && status !== AccountStatus.REJECTED) {
      throw new AppError('Only pending and declined requests can be listed here', 400);
    }

    const requests = await this.repo.findUsersByStatus(status, departmentId);
    return requests.map((u) => UserMapper.toResponse(u));
  }

  /*
    Approve an account, optionally correcting what was requested.

    The placement is re-validated here even though signup already checked it:
    another VP may have approved this department's dispatcher while the request
    sat in the queue. The partial unique indexes in the database are the final
    backstop if two approvals race.
  */
  async approve(
    userId: string,
    overrides: ApprovalOverrides,
    caller: ApprovalCaller,
  ): Promise<UserResponse> {
    const departmentId = this.assertVp(caller);
    const user = await this.loadReviewable(userId, departmentId);

    const grant: GrantedAccess = {
      role: overrides.role ?? user.requested?.role ?? UserRole.MEMBER,
      departmentId: overrides.departmentId ?? user.requested?.departmentId ?? departmentId,
      teamLeaderId:
        overrides.teamLeaderId !== undefined
          ? overrides.teamLeaderId
          : (user.requested?.teamLeaderId ?? null),
      isDispatcher: overrides.isDispatcher ?? user.requested?.isDispatcher ?? false,
    };

    // A VP may only place people inside their own department, however the
    // request or the override was worded.
    if (grant.departmentId !== departmentId) {
      throw new AppError('You can only approve accounts into your own department', 403);
    }

    // Normalise combinations that cannot coexist before validating, so a VP
    // switching someone from TEAM_LEADER to MEMBER does not trip the
    // "only a Team Leader can be the dispatcher" rule on a leftover flag.
    if (grant.role !== UserRole.TEAM_LEADER) grant.isDispatcher = false;
    if (grant.role !== UserRole.MEMBER) grant.teamLeaderId = null;

    await this.validator.validate(grant, userId);

    try {
      const approved = await this.repo.approveUser(userId, grant, caller.id);
      return UserMapper.toResponse(approved);
    } catch (err) {
      throw this.translateUniqueViolation(err);
    }
  }

  async reject(userId: string, reason: string | null, caller: ApprovalCaller): Promise<UserResponse> {
    const departmentId = this.assertVp(caller);
    await this.loadReviewable(userId, departmentId);

    const rejected = await this.repo.rejectUser(userId, caller.id, reason);
    return UserMapper.toResponse(rejected);
  }

  // Private helpers

  private assertVp(caller: ApprovalCaller): string {
    if (caller.role !== UserRole.VP) {
      throw new AppError('Only a VP can review signup requests', 403);
    }
    if (!caller.departmentId) {
      throw new AppError('No department assigned to your account', 400);
    }
    return caller.departmentId;
  }

  /*
    Loads a request that is still open to a decision.

    REJECTED counts as reviewable, not final: declining someone is a judgement
    call a VP must be able to take back. ACTIVE does not — changing an approved
    account's access belongs to member management, which validates differently.
  */
  private async loadReviewable(userId: string, departmentId: string): Promise<User> {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError('Account not found', 404);

    if (user.status === AccountStatus.ACTIVE) {
      throw new AppError(
        'This account is already active. Change it from member management instead.',
        409,
      );
    }
    // Pending accounts have no granted department yet, so scope on the
    // department they applied to.
    if (user.requested?.departmentId !== departmentId) {
      throw new AppError('This request is for a different department', 403);
    }

    return user;
  }

  /*
    Turns a lost race on one_dispatcher_per_department / one_vp_per_department
    into the same message the pre-check would have produced.
  */
  private translateUniqueViolation(err: unknown): unknown {
    const code = (err as { code?: string })?.code;
    if (code !== 'P2002') return err;

    const target = String((err as { meta?: { target?: unknown } })?.meta?.target ?? '');
    if (target.includes('dispatcher')) {
      return new AppError(
        'This department already has a dispatcher. Someone else was approved first.',
        409,
      );
    }
    if (target.includes('vp')) {
      return new AppError(
        'This department already has a VP. Someone else was approved first.',
        409,
      );
    }
    return err;
  }
}
