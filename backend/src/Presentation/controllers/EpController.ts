import { Request, Response } from 'express';
import { getApprovedEpsUseCase, getRealisedEpsUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';

// Shared error handler 
function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export class EpController {
  /*
    GET /approved-eps
    Query params:
      - departmentId (optional) VPs only; scopes the result to another department

    Reads 'req.user' set by authMiddleware
    TLs and MEMBERs: always see their own department
    VPs: may pass ?departmentId=... to view any department
  */
  static async getApproved(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!; // guaranteed by authMiddleware
      const requestedDepartmentId = req.query['departmentId'] as string | undefined;

      const eps = await getApprovedEpsUseCase.execute(caller, requestedDepartmentId);

      res.status(200).json({ data: eps, count: eps.length });
    } catch (err) {
      handleError(res, err);
    }
  }
  /*
    GET /realised-eps
    Query params:
      - departmentId (optional) VPs only; scopes the result to another department

    Returns only REALIZED EPs joined with ApprovedDetail
  */
  static async getRealised(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const requestedDepartmentId = req.query['departmentId'] as string | undefined;

      const eps = await getRealisedEpsUseCase.execute(caller, requestedDepartmentId, {});

      res.status(200).json({ data: eps, count: eps.length });
    } catch (err) {
      handleError(res, err);
    }
  }
}
