import { Request, Response } from 'express';
import { getApprovedEpsUseCase, getRealisedEpsUseCase, epManagementUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { UserRole } from '../../Domain/enums/UserRole';
import { EpFilters } from '../../Application/use-cases/ep/EpFilters';
import { EpUpdateData } from '../../Application/use-cases/ep/EpUpdateData';
import { Product } from '../../Domain/enums/Product';
import { TrackingPhase } from '../../Domain/enums/TrackingPhase';
import { Duration } from '../../Domain/enums/Duration';
import { Availability } from '../../Domain/enums/Availability';

// Shared error handler
function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Parses optional query-string filters into the shared EpFilters shape
function parseFilters(query: Request['query']): EpFilters {
  const filters: EpFilters = {};

  if (typeof query['university']   === 'string') filters.university   = query['university'];
  if (typeof query['fieldOfStudy'] === 'string') filters.fieldOfStudy = query['fieldOfStudy'];
  if (typeof query['createdFrom']  === 'string') filters.createdFrom  = query['createdFrom'];
  if (typeof query['createdTo']    === 'string') filters.createdTo    = query['createdTo'];
  if (typeof query['search']       === 'string') filters.search       = query['search'];

  const productParam = query['product'];
  if (typeof productParam === 'string' && Object.values(Product).includes(productParam as Product)) {
    filters.product = productParam as Product;
  }

  const phaseParam = query['trackingPhase'];
  if (typeof phaseParam === 'string' && Object.values(TrackingPhase).includes(phaseParam as TrackingPhase)) {
    filters.trackingPhase = phaseParam as TrackingPhase;
  }

  const durationParam = query['duration'];
  if (typeof durationParam === 'string' && Object.values(Duration).includes(durationParam as Duration)) {
    filters.duration = durationParam as Duration;
  }

  // Boolean query params arrive as the strings 'true' / 'false'
  if (query['contacted']  === 'true')  filters.contacted  = true;
  if (query['contacted']  === 'false') filters.contacted  = false;
  if (query['interested'] === 'true')  filters.interested = true;
  if (query['interested'] === 'false') filters.interested = false;

  return filters;
}

export class EpController {

  /*
    GET /eps
    - MEMBER: returns only their own assigned EPs
    - TL/VP: returns all department EPs (accepts optional ?memberId= to scope to one member)
  */
  static async getEps(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const filters = parseFilters(req.query);

      if (caller.role === UserRole.MEMBER) {
        const eps = await epManagementUseCase.getMyEps(caller, filters);
        res.status(200).json({ data: eps, count: eps.length });
      } else {
        const memberId = typeof req.query['memberId'] === 'string' ? req.query['memberId'] : undefined;
        const eps = await epManagementUseCase.getTeamEps(caller, memberId, filters);
        res.status(200).json({ data: eps, count: eps.length });
      }
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    PATCH /eps/:id
    Member only (updates CRM fields on their own assigned EP)
    Body accepts any subset of EpUpdateData fields
  */
  static async updateEp(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const epId   = req.params['id']!;

      // Parse only the known updatable fields (unknown keys are ignored)
      const body = req.body as Record<string, unknown>;
      const data: EpUpdateData = {};

      if ('source'        in body) data.source        = body['source']        as string | null;
      if ('cvLink'        in body) data.cvLink        = body['cvLink']        as string | null;
      if ('notes'         in body) data.notes         = body['notes']         as string | null;
      if ('contacted'     in body) data.contacted     = Boolean(body['contacted']);
      if ('interested'    in body) data.interested    = Boolean(body['interested']);

      if ('trackingPhase' in body) {
        const v = body['trackingPhase'];
        data.trackingPhase = (v === null || v === undefined)
          ? null
          : (v as TrackingPhase);
      }
      if ('duration' in body) {
        const v = body['duration'];
        data.duration = (v === null || v === undefined) ? null : (v as Duration);
      }
      if ('availability' in body) {
        const v = body['availability'];
        data.availability = (v === null || v === undefined) ? null : (v as Availability);
      }

      const updated = await epManagementUseCase.updateEp(epId, caller, data);
      res.status(200).json({ data: updated });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /eps/under-process
    TL/VP only (EPs with trackingPhase = LOOKING_FOR_OPPORTUNITIES)
    Read-only, TL/VP may comment via POST /eps/:id/comments
  */
  static async getEpsUnderProcess(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const eps = await epManagementUseCase.getEpsUnderProcess(caller);
      res.status(200).json({ data: eps, count: eps.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    POST /eps/:id/comments
    TL/VP only (adds a comment on a specific EP)
  */
  static async addComment(req: Request, res: Response): Promise<void> {
    try {
      const caller    = req.user!;
      const epId      = req.params['id']!;
      const { fieldName, content } = req.body as { fieldName?: string; content?: string };

      if (!content || typeof content !== 'string' || content.trim() === '') {
        res.status(400).json({ message: 'content is required and must be a non-empty string' });
        return;
      }

      const comment = await epManagementUseCase.addComment(
        epId,
        caller,
        fieldName ?? null,
        content.trim(),
      );

      res.status(201).json({ data: comment });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /eps/:id/comments
    All authenticated department members can read an EP's comments
  */
  static async getComments(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const epId   = req.params['id']!;
      const comments = await epManagementUseCase.getComments(epId, caller);
      res.status(200).json({ data: comments, count: comments.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /approved-eps
    TL/VP (all approved EPs for the caller's department)
  */
  static async getApproved(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const requestedDepartmentId = req.query['departmentId'] as string | undefined;
      const eps = await getApprovedEpsUseCase.execute(caller, requestedDepartmentId);
      res.status(200).json({ data: eps, count: eps.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /realised-eps
    TL/VP (REALIZED EPs with ApprovedDetail)
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
