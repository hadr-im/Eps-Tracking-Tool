import { Request, Response } from 'express';
import { dashboardUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export class DashboardController {
  
  /*
    GET /dashboard/me
    Returns the personal dashboard for the logged-in user
    MEMBER gets basic stats, TL/VP gets basic stats + member breakdown
  */
  static async getMyDashboard(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      if (caller.role === 'MEMBER') {
        const data = await dashboardUseCase.getMemberDashboard(caller, caller.id);
        res.status(200).json({ data });
      } else {
        const data = await dashboardUseCase.getTeamLeaderDashboard(caller);
        res.status(200).json({ data });
      }
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /dashboard/member/:id
    Returns the personal dashboard for a specific member
    TL / VP only
  */
  static async getMemberDashboard(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const targetUserId = req.params['id'] as string;
      if (!targetUserId) throw new AppError('Member ID is required', 400);
      
      const data = await dashboardUseCase.getMemberDashboard(caller, targetUserId);
      res.status(200).json({ data });
    } catch (err) {
      handleError(res, err);
    }
  }


  /*
    GET /dashboard/department
    Returns the high-level VP dashboard
    VP only
  */
  static async getVpDashboard(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const requestedDepartmentId = req.query['departmentId'] as string | undefined;
      
      let months = 6;
      if (typeof req.query['months'] === 'string') {
        const parsed = parseInt(req.query['months'], 10);
        if (!isNaN(parsed) && parsed > 0) {
          months = parsed;
        }
      }

      const data = await dashboardUseCase.getVpDashboard(caller, requestedDepartmentId, months);
      res.status(200).json({ data });
    } catch (err) {
      handleError(res, err);
    }
  }
}
