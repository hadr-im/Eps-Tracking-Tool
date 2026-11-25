import { Request, Response } from 'express';
import { adminDashboardUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import type { AdminPeriod } from '../../Application/use-cases/admin/AdminDashboardUseCase';
import type { ExpaRange } from '../../Domain/abstracts/IAdminRepository';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const PERIODS: AdminPeriod[] = ['week', 'month', 'all'];
const RANGES: ExpaRange[] = ['day', 'week', 'month', 'all'];

export class AdminController {
  /*
    GET /admin/dashboard?period=week|month|all&range=day|week|month|all

    Everything the admin page draws, in one response. The page shows all of
    it at once, so splitting it into five endpoints would only buy five
    round trips.
  */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const raw = req.query['period'];
      const period: AdminPeriod =
        typeof raw === 'string' && PERIODS.includes(raw as AdminPeriod)
          ? (raw as AdminPeriod)
          : 'month';

      const rawRange = req.query['range'];
      const expaRange: ExpaRange =
        typeof rawRange === 'string' && RANGES.includes(rawRange as ExpaRange)
          ? (rawRange as ExpaRange)
          : 'day';

      const data = await adminDashboardUseCase.getDashboard(req.user!, period, expaRange);
      res.status(200).json({ data });
    } catch (err) {
      handleError(res, err);
    }
  }
}
