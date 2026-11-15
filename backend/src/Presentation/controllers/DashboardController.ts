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

/*
  Reads an optional sign-up-date window off the query string.

  The preset ("this month", "last 3 months") is resolved in the browser, which
  knows the reader's timezone; the API only ever sees two dates. The upper
  bound runs to the last millisecond of its day, because createdAtExpa is a
  timestamp and comparing it against midnight would silently drop everything
  that arrived after it.
*/
function parseWindow(query: Request['query']): { from?: Date; to?: Date } {
  const parse = (value: unknown, endOfDay: boolean): Date | undefined => {
    if (typeof value !== 'string') return undefined;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    return endOfDay
      ? new Date(y, m - 1, d, 23, 59, 59, 999)
      : new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const from = parse(query['from'], false);
  const to = parse(query['to'], true);

  return { ...(from && { from }), ...(to && { to }) };
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
        const data = await dashboardUseCase.getMemberDashboard(caller, caller.id, parseWindow(req.query));
        res.status(200).json({ data });
      } else {
        const data = await dashboardUseCase.getTeamLeaderDashboard(caller, parseWindow(req.query));
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
      
      const data = await dashboardUseCase.getMemberDashboard(caller, targetUserId, parseWindow(req.query));
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

      const data = await dashboardUseCase.getVpDashboard(caller, requestedDepartmentId, months, parseWindow(req.query));
      res.status(200).json({ data });
    } catch (err) {
      handleError(res, err);
    }
  }
}
