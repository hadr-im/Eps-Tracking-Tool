import { Request, Response } from 'express';
import { manualLeadUseCase } from '../../Infrastructure/container';
import { AppError } from '../../Application/errors/AppError';
import { ManualLeadInput } from '../../Application/use-cases/dispatch/ManualLeadUseCase';

function handleError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Reads only the fields the form owns. Department, product, status and the
// manual flag are all decided server-side.
function parseInput(body: Record<string, unknown>): ManualLeadInput {
  const str = (key: string): string | null => {
    const v = body[key];
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
  };

  const yearRaw = body['yearOfStudy'];
  const year =
    typeof yearRaw === 'number'
      ? yearRaw
      : typeof yearRaw === 'string' && yearRaw.trim() !== ''
      ? Number(yearRaw)
      : null;

  return {
    expaId: str('expaId'),
    fullName: str('fullName') ?? '',
    email: str('email'),
    phone: str('phone'),
    university: str('university'),
    fieldOfStudy: str('fieldOfStudy'),
    yearOfStudy: year !== null && Number.isFinite(year) ? year : null,
    source: str('source'),
    cvLink: str('cvLink'),
    notes: str('notes'),
  };
}

export class ManualLeadController {
  /*
   GET /manual-leads
   Unassigned hand-entered leads for the caller's department. TL and VP only.
  */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const leads = await manualLeadUseCase.list(req.user!);
      res.status(200).json({ data: leads, count: leads.length });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
   GET /manual-leads/expa/:expaId
   Looks the person up on EXPA to prefill the form. Saves nothing.
  */
  static async lookupExpa(req: Request, res: Response): Promise<void> {
    try {
      const expaId = typeof req.params['expaId'] === 'string' ? req.params['expaId'] : '';
      const result = await manualLeadUseCase.lookupExpa(expaId, req.user!);
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  }

  /*
   POST /manual-leads
   Creates a hand-entered lead in the caller's department.
  */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input = parseInput((req.body ?? {}) as Record<string, unknown>);
      const lead = await manualLeadUseCase.create(input, req.user!);
      res.status(201).json({ data: lead });
    } catch (err) {
      handleError(res, err);
    }
  }
}
