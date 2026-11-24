import { Request, Response } from 'express';
import { adminDashboardUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import type { AdminPeriod } from '../../Application/use-cases/admin/AdminDashboardUseCase';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const PERIODS: AdminPeriod[] = ['week', 'month', 'all'];

export class AdminController {
  /*
    GET /admin/dashboard?period=week|month|all&hours=24

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

      // Bounded: the series is drawn as a line, and a year of hourly points
      // is neither readable nor cheap.
      const parsed = Number(req.query['hours']);
      const hours = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 24 * 14) : 24;

      const data = await adminDashboardUseCase.getDashboard(req.user!, period, hours);
      res.status(200).json({ data });
    } catch (err) {
      handleError(res, err);
    }
  }
}
