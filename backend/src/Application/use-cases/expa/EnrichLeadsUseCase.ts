import crypto from 'crypto';
import { IEpRepository, EpContactEnrichment } from '../../../Domain/abstracts/IEpRepository';
import { ISheetLeadRepository } from '../../../Domain/abstracts/ISheetLeadRepository';
import { Ep } from '../../../Domain/entities/Ep';
import { SheetLead } from '../../../Domain/types/SheetLead';
import { EpStatus } from '../../../Domain/enums/EpStatus';
import { PROGRAMME_DEPARTMENT_ID } from '../../../Domain/enums/Product';

/*
  Fills in the contact details EXPA does not return.

  A sign-up creates an EXPA account and a row in the form's response sheet.
  EXPA gives us the person but hides their address behind a relay
  (p_<hash>@inbound.aiesec.org) and returns no phone at all, so the sheet is
  the only source for either. Both sides carry the EXPA id, which makes the
  join exact — no name matching.

  Deliberately conservative: it only fills a field that is empty or, for
  email, still a relay address. Anything a member typed is left alone, because
  a correction made in the CRM is better information than a form answer from
  months ago.
*/

export interface EnrichResult {
  sheetRows: number;
  matchedEps: number;
  updatedEps: number;
  fields: { email: number; phone: number; university: number; fieldOfStudy: number; yearOfStudy: number; source: number };
  // Sign-ups with no lead in the database at all.
  unmatchedSignups: number;
  // Of those, the ones created from the sheet, by department.
  createdEps: number;
  createdByProduct: Record<string, number>;
  // Sign-ups that could not be placed because column J named no known type.
  unplaceable: number;
  // Sign-ups with no lead that predate the creation cutoff.
  tooOldToCreate: number;
}

// EXPA's relay address: present, but useless for contacting anyone.
const RELAY_EMAIL = /@inbound\.aiesec\.org$/i;

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === '';
}

export class EnrichLeadsUseCase {
  /*
    `createFrom` bounds only the creation of new leads — the sheet reaches back
    to January and those cohorts were worked in the old spreadsheet tool.

    Enrichment is deliberately unbounded: if a lead is already in the database,
    their real email and phone should be filled in no matter when they signed
    up. Conflating the two left old leads stuck with a relay address while the
    sheet held their details all along.
  */
  constructor(
    private readonly sheetRepo: ISheetLeadRepository,
    private readonly epRepo: IEpRepository,
    private readonly createFrom: Date | null = process.env['LEADS_SHEET_FROM_DATE']
      ? new Date(process.env['LEADS_SHEET_FROM_DATE']!)
      : null,
  ) {
    if (this.createFrom && Number.isNaN(this.createFrom.getTime())) {
      throw new Error('LEADS_SHEET_FROM_DATE is not a valid date (expected YYYY-MM-DD)');
    }
  }

  async execute(dryRun = false): Promise<EnrichResult> {
    const signups = await this.sheetRepo.fetchAll();

    const result: EnrichResult = {
      sheetRows: signups.length,
      matchedEps: 0,
      updatedEps: 0,
      fields: { email: 0, phone: 0, university: 0, fieldOfStudy: 0, yearOfStudy: 0, source: 0 },
      unmatchedSignups: 0,
      createdEps: 0,
      createdByProduct: {},
      unplaceable: 0,
      tooOldToCreate: 0,
    };

    if (signups.length === 0) return result;

    // One query for every lead the sheet knows about, across all departments.
    const eps = await this.epRepo.findByExpaIds(signups.map((s) => s.expaId));

    // A person can hold a row in more than one department, and the sheet
    // describes the person — so every one of their rows gets enriched.
    const epsByExpaId = new Map<string, Ep[]>();
    for (const ep of eps) {
      if (!ep.expaId) continue;
      const list = epsByExpaId.get(ep.expaId) ?? [];
      list.push(ep);
      epsByExpaId.set(ep.expaId, list);
    }

    const updates: EpContactEnrichment[] = [];
    const toCreate: Ep[] = [];

    for (const signup of signups) {
      const matches = epsByExpaId.get(signup.expaId);

      if (!matches || matches.length === 0) {
        result.unmatchedSignups++;

        // Too old to be worth importing — they belong to a past campaign.
        if (this.createFrom && signup.submittedAt && signup.submittedAt < this.createFrom) {
          result.tooOldToCreate++;
          continue;
        }

        /*
          The person signed up but the EXPA sync never imported them, because
          EXPA holds no tracked programme for them. The form does — column J
          is the only record of what they actually chose, so it places them.
        */
        const created = this.buildFromSignup(signup);
        if (created.length === 0) {
          result.unplaceable++;
        } else {
          toCreate.push(...created);
          for (const ep of created) {
            result.createdByProduct[ep.product] = (result.createdByProduct[ep.product] ?? 0) + 1;
          }
        }
        continue;
      }

      for (const ep of matches) {
        result.matchedEps++;
        const update = this.diff(ep, signup, result);
        if (update) updates.push(update);
      }
    }

    result.updatedEps = updates.length;
    result.createdEps = toCreate.length;

    if (!dryRun) {
      if (updates.length > 0) await this.epRepo.enrichMany(updates);
      // skipDuplicates covers the (expaId, departmentId) constraint, so a
      // re-run cannot double-insert anyone.
      if (toCreate.length > 0) await this.epRepo.saveMany(toCreate);
    }

    console.log(
      `[EnrichLeadsUseCase] ${dryRun ? 'DRY RUN — ' : ''}` +
        `${result.sheetRows} sign-ups, ${result.matchedEps} matching leads, ` +
        `${result.updatedEps} updated, ${result.createdEps} created ` +
        `${JSON.stringify(result.createdByProduct)}, ${result.unplaceable} unplaceable, ${result.tooOldToCreate} too old to create. ` +
        `Fields: ${JSON.stringify(result.fields)}`,
    );

    return result;
  }

  /*
    One lead per internship type the person ticked, mirroring how the EXPA
    sync expands a multi-programme signup.

    The first copy takes the EXPA id as its row id, matching the sync's
    convention; further copies get a generated id and are tied back by expaId.
  */
  private buildFromSignup(signup: SheetLead): Ep[] {
    return signup.products.map((product, index) => {
      const now = new Date();
      return new Ep(
        index === 0 ? signup.expaId : crypto.randomUUID(),
        signup.fullName || 'Unknown',
        signup.email,
        signup.phone,
        signup.university,
        signup.fieldOfStudy,
        signup.yearOfStudy,
        product,
        PROGRAMME_DEPARTMENT_ID[product],
        EpStatus.LEAD,
        // The form submission is the closest thing to a registration date for
        // someone EXPA never surfaced.
        signup.submittedAt ?? now,
        now,
        null,  // ownerId — unassigned, so it lands in the dispatch pool
        null,  // assignedAt
        signup.source,
        null,  // cvLink
        false, // contacted
        null,  // contactedAt
        false, // interested
        null,  // trackingPhase
        null,  // notes
        null,  // duration
        null,  // availability
        false, // addedManually — this came from the sign-up form, not by hand
        signup.expaId,
      );
    });
  }

  /*
    Returns only the fields worth writing, or null when the lead already knows
    everything the sheet does.
  */
  private diff(ep: Ep, signup: SheetLead, result: EnrichResult): EpContactEnrichment | null {
    const update: EpContactEnrichment = { id: ep.id };
    let changed = false;

    // Email is the one field that overwrites: a relay address is strictly
    // worse than a real one, and is never something a person typed.
    if (signup.email && (isBlank(ep.email) || RELAY_EMAIL.test(ep.email!))) {
      update.email = signup.email;
      result.fields.email++;
      changed = true;
    }

    if (signup.phone && isBlank(ep.phone)) {
      update.phone = signup.phone;
      result.fields.phone++;
      changed = true;
    }

    /*
      University and field of study overwrite rather than fill.

      EXPA supplies both, but badly: `lc_alignment.keywords` arrives padded
      with whitespace, and `backgrounds[0]` is a coarse taxonomy that files
      people under "Other" when the form says "Logistics". The sheet holds
      what the person actually typed.

      Safe to overwrite because neither field is in EpUpdateData — the CRM
      cannot edit them, so there is never a member's correction underneath.
    */
    if (signup.university && signup.university !== ep.university) {
      update.university = signup.university;
      result.fields.university++;
      changed = true;
    }

    if (signup.fieldOfStudy && signup.fieldOfStudy !== ep.fieldOfStudy) {
      update.fieldOfStudy = signup.fieldOfStudy;
      result.fields.fieldOfStudy++;
      changed = true;
    }

    if (signup.yearOfStudy !== null && ep.yearOfStudy === null) {
      update.yearOfStudy = signup.yearOfStudy;
      result.fields.yearOfStudy++;
      changed = true;
    }

    if (signup.source && isBlank(ep.source)) {
      update.source = signup.source;
      result.fields.source++;
      changed = true;
    }

    return changed ? update : null;
  }
}
