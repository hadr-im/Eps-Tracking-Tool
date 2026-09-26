import { Request, Response } from 'express';
import { getApprovedEpsWithDetailUseCase, getRealisedEpsUseCase, epManagementUseCase, transitionEpUseCase, userManagementUseCase, getTransitionsUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { UserRole } from '../../Domain/enums/UserRole';
import { EpFilters } from '../../Application/use-cases/ep/EpFilters';
import { EpUpdateData } from '../../Application/use-cases/ep/EpUpdateData';
import { Product } from '../../Domain/enums/Product';
import { TrackingPhase } from '../../Domain/enums/TrackingPhase';
import { Duration } from '../../Domain/enums/Duration';
import { Availability } from '../../Domain/enums/Availability';
import { EpStatus } from '../../Domain/enums/EpStatus';

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

  const statusParam = query['status'];
  if (typeof statusParam === 'string' && Object.values(EpStatus).includes(statusParam as EpStatus)) {
    filters.status = statusParam as EpStatus;
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

  static async getEps(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const filters = parseFilters(req.query);

      // TL / VP: optional memberId to drill into one member
      const memberId = typeof req.query['memberId'] === 'string' ? req.query['memberId'] : undefined;

      if (memberId) {
        // Specific member requested, works for both TL and VP
        // (The use case validates that the caller has permission to view this member)
        const eps = await epManagementUseCase.getTeamEps(caller, memberId, filters);
        res.status(200).json({ data: eps, count: eps.length });
        return;
      }

      // No memberId provided: the caller wants to see their OWN assigned EPs
      // (This applies to MEMBER, TEAM_LEADER, and VP roles alike since anyone can have EPs)
      const eps = await epManagementUseCase.getMyEps(caller, filters);
      res.status(200).json({ data: eps, count: eps.length });
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
      const epId   = typeof req.params['id'] === 'string' ? req.params['id'] : '';

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
    PATCH /eps/:id/owner
    TL / VP reassigns an EP to a different member in the same department.
  */
  static async reassignOwner(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const epId   = typeof req.params['id'] === 'string' ? req.params['id'] : '';
      const memberId = (req.body as { memberId?: unknown })?.memberId;
      if (typeof memberId !== 'string' || memberId.length === 0) {
        res.status(400).json({ message: 'memberId is required' });
        return;
      }
      const updated = await epManagementUseCase.reassignOwner(epId, memberId, caller);
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
      const epId      = typeof req.params['id'] === 'string' ? req.params['id'] : '';
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
      const epId   = typeof req.params['id'] === 'string' ? req.params['id'] : '';
      const comments = await epManagementUseCase.getComments(epId, caller);
      res.status(200).json({ data: comments, count: comments.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /approved-eps
    TL/VP (all approved+ EPs for the caller's department, with ApprovedDetail joined)
  */
  static async getApproved(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const requestedDepartmentId = typeof req.query['departmentId'] === 'string'
        ? req.query['departmentId']
        : undefined;
      const filters = parseFilters(req.query);
      const eps = await getApprovedEpsWithDetailUseCase.execute(caller, requestedDepartmentId, filters);
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

  /*
    POST /eps/:id/transition
    MEMBER (own EPs) / TL (dept EPs) / VP (any EP)
  */
  static async transitionEp(req: Request, res: Response): Promise<void> {
    try {
      const epId = typeof req.params['id'] === 'string' ? req.params['id'] : '';
      if (!epId) throw new AppError('EP ID is required', 400);
      
      const targetProduct = req.body['targetProduct'];
      if (!targetProduct) throw new AppError('targetProduct is required', 400);

      const note = req.body['note'];

      const data = await transitionEpUseCase.execute({
        epId,
        targetProduct: targetProduct as Product,
        caller: req.user!,
        note: note ? String(note) : undefined,
      });

      res.status(200).json({ data });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
    GET /eps/transitions
    TL/VP (all transitions inbound or outbound for their department)
  */
  static async getTransitions(req: Request, res: Response): Promise<void> {
    try {
      const caller = req.user!;
      const data = await getTransitionsUseCase.execute(caller);
      res.status(200).json({ data, count: data.length });
    } catch (err) {
      handleError(res, err);
    }
  }
}
