import { Request, Response } from 'express';
import { accountApprovalUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { ApprovalOverrides } from '../../Application/use-cases/user/AccountApprovalUseCase';
import { UserRole } from '../../Domain/enums/UserRole';
import { AccountStatus } from '../../Domain/enums/AccountStatus';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/*
  Reads only the fields a VP is allowed to correct.

  Each key is read with `in` so that an explicit null (unassign the Team
  Leader) is distinguishable from an omitted key (keep what was requested).
*/
function parseOverrides(body: Record<string, unknown>): ApprovalOverrides {
  const overrides: ApprovalOverrides = {};

  if ('role' in body) {
    const role = body['role'];
    if (typeof role !== 'string' || !Object.values(UserRole).includes(role as UserRole)) {
      throw new AppError('Invalid role', 400);
    }
    overrides.role = role as UserRole;
  }

  if ('departmentId' in body) {
    const departmentId = body['departmentId'];
    if (typeof departmentId !== 'string' || departmentId === '') {
      throw new AppError('Invalid departmentId', 400);
    }
    overrides.departmentId = departmentId;
  }

  if ('teamLeaderId' in body) {
    const teamLeaderId = body['teamLeaderId'];
    if (teamLeaderId !== null && typeof teamLeaderId !== 'string') {
      throw new AppError('Invalid teamLeaderId', 400);
    }
    overrides.teamLeaderId = (teamLeaderId as string | null) || null;
  }

  if ('isDispatcher' in body) {
    overrides.isDispatcher = Boolean(body['isDispatcher']);
  }

  return overrides;
}

export class AccountApprovalController {
  /*
    GET /users/pending
    VP only. Accounts awaiting review in the caller's department.
  */
  static async listPending(req: Request, res: Response): Promise<void> {
    try {
      // ?status=REJECTED lists declined requests so a decision can be undone.
      const raw = req.query['status'];
      const status =
        raw === AccountStatus.REJECTED ? AccountStatus.REJECTED : AccountStatus.PENDING;

      const requests = await accountApprovalUseCase.listRequests(req.user!, status);
      res.status(200).json({ data: requests, count: requests.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    POST /users/:id/approve
    VP only. Body may override any of role, departmentId, teamLeaderId,
    isDispatcher; anything omitted keeps what the applicant requested.
  */
  static async approve(req: Request, res: Response): Promise<void> {
    try {
      const userId = typeof req.params['id'] === 'string' ? req.params['id'] : '';
      const overrides = parseOverrides((req.body ?? {}) as Record<string, unknown>);

      const user = await accountApprovalUseCase.approve(userId, overrides, req.user!);
      res.status(200).json({ data: user });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    POST /users/:id/reject
    VP only. Body: { reason?: string }
  */
  static async reject(req: Request, res: Response): Promise<void> {
    try {
      const userId = typeof req.params['id'] === 'string' ? req.params['id'] : '';
      const rawReason = (req.body as { reason?: unknown })?.reason;
      const reason =
        typeof rawReason === 'string' && rawReason.trim() !== '' ? rawReason.trim() : null;

      const user = await accountApprovalUseCase.reject(userId, reason, req.user!);
      res.status(200).json({ data: user });
    } catch (err) {
      handleError(res, err);
    }
  }
}
