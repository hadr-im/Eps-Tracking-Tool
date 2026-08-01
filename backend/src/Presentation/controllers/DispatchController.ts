import { Request, Response } from 'express';
import { dispatchUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { DispatchFilters } from '../../Application/use-cases/dispatch/DispatchFilters';
import { Product } from '../../Domain/enums/Product';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function parseDispatchFilters(query: Request['query']): DispatchFilters {
  const filters: DispatchFilters = {};

  if (typeof query['status']      === 'string') filters.status      = query['status'];
  if (typeof query['university']  === 'string') filters.university  = query['university'];
  if (typeof query['fieldOfStudy']=== 'string') filters.fieldOfStudy= query['fieldOfStudy'];
  if (typeof query['createdFrom'] === 'string') filters.createdFrom = query['createdFrom'];
  if (typeof query['createdTo']   === 'string') filters.createdTo   = query['createdTo'];

  const productParam = query['product'];
  if (typeof productParam === 'string' && Object.values(Product).includes(productParam as Product)) {
    filters.product = productParam;
  }

  return filters;
}

export class DispatchController {
  /*
   GET /leads
   Returns unassigned leads for the dispatcher's department
   TL (isDispatcher) only
   */
  static async getLeadsPool(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      if (!caller.departmentId) {
        res.status(400).json({ message: 'No department assigned to your account' });
        return;
      }

      const filters = parseDispatchFilters(req.query);
      const eps = await dispatchUseCase.getLeadsPool(caller.departmentId, filters);

      res.status(200).json({ data: eps, count: eps.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
   POST /dispatch
   Assigns one or more EPs to a member
   Body: { epIds: string[], memberId: string }
   TL (isDispatcher) only 
   */
  static async dispatch(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      if (!caller.departmentId) {
        res.status(400).json({ message: 'No department assigned to your account' });
        return;
      }

      const { epIds, memberId } = req.body as { epIds?: string[]; memberId?: string };

      if (!Array.isArray(epIds) || epIds.length === 0) {
        res.status(400).json({ message: 'epIds must be a non-empty array' });
        return;
      }
      if (!memberId || typeof memberId !== 'string') {
        res.status(400).json({ message: 'memberId is required' });
        return;
      }

      // Fetch members to validate the target belongs to the same department
      const members = await dispatchUseCase.getDepartmentMembers(caller.departmentId);
      const updatedEps = await dispatchUseCase.dispatch(epIds, memberId, caller, members);

      res.status(200).json({
        message: `${updatedEps.length} EP(s) assigned successfully`,
        data: updatedEps,
      });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
   GET /departments/{id}/members 
   Returns all members of the caller's department
   TL / VP only
   */
  static async getDepartmentMembers(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      if (!caller.departmentId) {
        res.status(400).json({ message: 'No department assigned to your account' });
        return;
      }

      const members = await dispatchUseCase.getDepartmentMembers(caller.departmentId);

      res.status(200).json({ data: members, count: members.length });
    } catch (err) {
      handleError(res, err);
    }
  }
}
