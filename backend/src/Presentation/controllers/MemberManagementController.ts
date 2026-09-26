import { Request, Response } from 'express';
import { memberManagementUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { AccessChanges } from '../../Application/use-cases/user/MemberManagementUseCase';
import { UserRole } from '../../Domain/enums/UserRole';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/*
  Reads only the fields a VP may change.

  Each key is read with `in` so an explicit null (unassign the Team Leader) is
  distinguishable from an omitted key (leave it as it is).
*/
function parseChanges(body: Record<string, unknown>): AccessChanges {
  const changes: AccessChanges = {};

  if ('role' in body) {
    const role = body['role'];
    if (typeof role !== 'string' || !Object.values(UserRole).includes(role as UserRole)) {
      throw new AppError('Invalid role', 400);
    }
    changes.role = role as UserRole;
  }

  if ('teamLeaderId' in body) {
    const teamLeaderId = body['teamLeaderId'];
    if (teamLeaderId !== null && typeof teamLeaderId !== 'string') {
      throw new AppError('Invalid teamLeaderId', 400);
    }
    changes.teamLeaderId = (teamLeaderId as string | null) || null;
  }

  if ('isDispatcher' in body) changes.isDispatcher = Boolean(body['isDispatcher']);
  if ('isDisabled' in body) changes.isDisabled = Boolean(body['isDisabled']);

  return changes;
}

export class MemberManagementController {
  /*
    GET /users/members
    VP only. Everyone approved into the caller's department.
  */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const members = await memberManagementUseCase.listMembers(req.user!);
      res.status(200).json({ data: members, count: members.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    PATCH /users/:id/access
    VP only. Body may carry any of role, teamLeaderId, isDispatcher, isDisabled.
  */
  static async updateAccess(req: Request, res: Response): Promise<void> {
    try {
      const userId = typeof req.params['id'] === 'string' ? req.params['id'] : '';
      const changes = parseChanges((req.body ?? {}) as Record<string, unknown>);

      const updated = await memberManagementUseCase.updateAccess(userId, changes, req.user!);
      res.status(200).json({ data: updated });
    } catch (err) {
      handleError(res, err);
    }
  }
}
