import { Request, Response } from 'express';
import {
  getApprovedEpsWithDetailUseCase,
  getRealisedEpsUseCase,
  getLeadsUseCase,
  manualSyncUseCase,
} from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { EpFilters } from '../../Application/use-cases/ep/EpFilters';
import { Product } from '../../Domain/enums/Product';

// Shared error handler
function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/*
  Parses query-string filter params into the shared EpFilters shape
  All fields are optional, unknown/invalid values are ignored
*/
function parseFilters(query: Request['query']): EpFilters {
  const filters: EpFilters = {};

  if (typeof query['university'] === 'string')   filters.university  = query['university'];
  if (typeof query['fieldOfStudy'] === 'string') filters.fieldOfStudy = query['fieldOfStudy'];
  if (typeof query['hostingMC'] === 'string')    filters.hostingMC   = query['hostingMC'];
  if (typeof query['hostingLC'] === 'string')    filters.hostingLC   = query['hostingLC'];
  if (typeof query['createdFrom'] === 'string')  filters.createdFrom = query['createdFrom'];
  if (typeof query['createdTo'] === 'string')    filters.createdTo   = query['createdTo'];

  const productParam = query['product'];
  if (typeof productParam === 'string' && Object.values(Product).includes(productParam as Product)) {
    filters.product = productParam as Product;
  }

  return filters;
}

export class ExpaController {
  /*
    POST /expa/sync
    Manual trigger: TL/VP can run a sync for their own department without waiting for cron
    Reads departmentId from the JWT token (set by authMiddleware)
  */
  static async manualSync(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      if (!caller.departmentId) {
        res.status(400).json({ message: 'No department assigned to your account' });
        return;
      }

      const result = await manualSyncUseCase.execute(caller.departmentId);

      res.status(200).json({
        message: 'Sync completed successfully',
        data: result,
      });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /expa/approved-eps
    Returns all APPROVED, REALIZED, COMPLETED, FINISHED EPs with ApprovedDetail joined

    Query filters are optional)
      ?university=  &fieldOfStudy=  &product=GV|GTA|GTE
      &hostingMC=   &hostingLC=
      &createdFrom= &createdTo=  (ISO date strings)
      &departmentId= (VP only: cross-department view)
  */
  static async getApprovedEps(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const requestedDepartmentId = req.query['departmentId'] as string | undefined;
      const filters = parseFilters(req.query);

      const eps = await getApprovedEpsWithDetailUseCase.execute(caller, requestedDepartmentId, filters);

      res.status(200).json({ data: eps, count: eps.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /expa/realised-eps
    Returns all REALIZED EPs with ApprovedDetail joined

    Same query filters as /approved-eps (minus the status filter: always REALIZED)
  */
  static async getRealisedEps(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const requestedDepartmentId = req.query['departmentId'] as string | undefined;
      const filters = parseFilters(req.query);

      const eps = await getRealisedEpsUseCase.execute(caller, requestedDepartmentId, filters);

      res.status(200).json({ data: eps, count: eps.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /expa/leads
    Returns all LEAD, CONTACTED, INTERESTED EPs (no ApprovedDetail)

    Query filters (all optional):
      ?university=  &fieldOfStudy=  &product=GV|GTA|GTE
      &createdFrom= &createdTo=
      &departmentId= (VP only)
  */
  static async getLeads(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const requestedDepartmentId = req.query['departmentId'] as string | undefined;
      const filters = parseFilters(req.query);

      const eps = await getLeadsUseCase.execute(caller, requestedDepartmentId, filters);

      res.status(200).json({ data: eps, count: eps.length });
    } catch (err) {
      handleError(res, err);
    }
  }
}
