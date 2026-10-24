import crypto from 'crypto';
import { IDispatchRepository } from '../../../Domain/abstracts/IDispatchRepository';
import { IExpaRepository } from '../../../Domain/abstracts/IExpaRepository';
import { Ep } from '../../../Domain/entities/Ep';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { Product, PROGRAMME_DEPARTMENT_ID } from '../../../Domain/enums/Product';
import { UserRole } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';
import { CallerContext } from './DispatchUseCase';
import { DispatchFilters } from './DispatchFilters';

/*
  Leads entered by hand rather than pulled in by the EXPA sync.

  Two ways in:
    - By EXPA id: the person is fetched from EXPA and the form is prefilled.
      The lead keeps its real EXPA id, so the hourly status sync tracks it
      exactly like any other EP.
    - Fully manual: for someone who is not on EXPA at all. The id is prefixed
      so it can never collide with a real EXPA person id later.

  Both are flagged addedManually, which keeps them out of the normal dispatch
  pool and on their own page.
*/

// What the form sends. Department and product come from the caller, never the
// client, so a lead cannot be filed into someone else's department.
export interface ManualLeadInput {
  expaId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  university?: string | null;
  fieldOfStudy?: string | null;
  yearOfStudy?: number | null;
  source?: string | null;
  cvLink?: string | null;
  notes?: string | null;
}

// Prefill returned by the EXPA lookup — deliberately not saved yet, so the
// user can correct anything before it becomes a record.
export interface ExpaLookupResult {
  expaId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  createdAtExpa: string;
  statusOnExpa: string;
  // True when this person is already in the database, in any department.
  alreadyExists: boolean;
}

const MANUAL_ID_PREFIX = 'manual-';

export class ManualLeadUseCase {
  constructor(
    private readonly dispatchRepo: IDispatchRepository,
    private readonly expaRepo: IExpaRepository,
  ) {}

  async list(caller: CallerContext, filters?: DispatchFilters): Promise<Ep[]> {
    this.assertCanManage(caller);
    return this.dispatchRepo.getManualLeads(caller.departmentId!, filters);
  }

  /*
    Looks a person up on EXPA so the form can be prefilled. Saves nothing.
  */
  async lookupExpa(expaId: string, caller: CallerContext): Promise<ExpaLookupResult> {
    this.assertCanManage(caller);

    const trimmed = expaId.trim();
    if (!trimmed) throw new AppError('Enter an EXPA ID', 400);

    const person = await this.expaRepo.fetchPersonById(trimmed);
    if (!person) throw new AppError(`No EXPA person found with ID ${trimmed}`, 404);

    return {
      expaId: person.epId,
      fullName: person.fullName,
      email: person.email,
      phone: person.phone,
      university: person.university,
      fieldOfStudy: person.fieldOfStudy,
      createdAtExpa: person.creationDate,
      statusOnExpa: person.statusOnExpa,
      // Scoped to the caller's department: this person may already be a lead
      // elsewhere and still be a valid addition here.
      alreadyExists: await this.dispatchRepo.existsInDepartment(
        person.epId,
        caller.departmentId!,
      ),
    };
  }

  async create(input: ManualLeadInput, caller: CallerContext): Promise<Ep> {
    this.assertCanManage(caller);

    const fullName = input.fullName?.trim();
    if (!fullName) throw new AppError('Full name is required', 400);

    const departmentId = caller.departmentId!;
    const product = this.productForDepartment(departmentId);

    const expaId = input.expaId?.trim() || null;

    if (expaId) {
      if (!/^\d+$/.test(expaId)) throw new AppError('An EXPA ID must be numeric', 400);
      if (await this.dispatchRepo.existsInDepartment(expaId, departmentId)) {
        throw new AppError(`EP ${expaId} is already a lead in your department`, 409);
      }
    }

    /*
      Prefer the EXPA id as the row id, matching how the sync stores a person's
      first copy. When that id is already taken — because another department
      added this person first — fall back to a generated one; expaId is what
      ties the copies together, not the row id.
    */
    const id =
      expaId && !(await this.dispatchRepo.idExists(expaId))
        ? expaId
        : `${MANUAL_ID_PREFIX}${crypto.randomUUID()}`;

    const ep = new Ep(
      id,
      fullName,
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.university?.trim() || null,
      input.fieldOfStudy?.trim() || null,
      input.yearOfStudy ?? null,
      product,
      departmentId,
      EpStatus.LEAD,
      // Stands in for the EXPA registration date, which a hand-entered lead
      // does not have. Keeps date sorting and filtering working.
      new Date(),
      new Date(),
      null, // ownerId — unassigned until dispatched
      null, // assignedAt
      input.source?.trim() || null,
      input.cvLink?.trim() || null,
      false, // contacted
      null,  // contactedAt
      false, // interested
      null,  // trackingPhase
      input.notes?.trim() || null,
      null,  // duration
      null,  // availability
      true,  // addedManually
      expaId,
    );

    return this.dispatchRepo.createManualLead(ep);
  }

  private assertCanManage(caller: CallerContext): void {
    if (caller.role !== UserRole.TEAM_LEADER && caller.role !== UserRole.VP) {
      throw new AppError('Only Team Leaders and VPs can manage manual leads', 403);
    }
    if (!caller.departmentId) {
      throw new AppError('No department assigned to your account', 400);
    }
  }

  // The department decides the product; the two are fixed pairs.
  private productForDepartment(departmentId: string): Product {
    const match = (Object.entries(PROGRAMME_DEPARTMENT_ID) as [Product, string][]).find(
      ([, id]) => id === departmentId,
    );
    if (!match) throw new AppError('Your department has no matching product', 400);
    return match[0];
  }
}
