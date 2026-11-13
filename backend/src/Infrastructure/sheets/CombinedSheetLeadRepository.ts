/*
  Presents several sign-up forms as one list of submissions.

  The LC runs more than one form — the general one and the T for Teaching one
  — and a person may appear in both. The enrichment should not have to know
  that: it asks for sign-ups and gets sign-ups.

  Merging here rather than in Google Sheets is deliberate. Stacking the sheets
  with IMPORTRANGE returns blank rows without raising anything when the source
  is itself an imported range, so the enrichment ran against nothing and
  reported success. Code fails loudly and can be tested.
*/

import { ISheetLeadRepository } from '../../Domain/abstracts/ISheetLeadRepository';
import { SheetLead } from '../../Domain/types/SheetLead';

export class CombinedSheetLeadRepository implements ISheetLeadRepository {
  constructor(private readonly sources: ISheetLeadRepository[]) {}

  async fetchAll(): Promise<SheetLead[]> {
    const results = await Promise.all(this.sources.map((s) => s.fetchAll()));

    /*
      Merged per person rather than last-one-wins.

      Someone who filled both forms has two partial records: the general form
      may hold their phone while the Teaching form holds their year. Taking
      whichever source happened to come last would throw away whatever the
      other one knew, so each field falls back to the first source that has an
      answer. Products accumulate — filling both forms means they are
      interested in both.
    */
    const merged = new Map<string, SheetLead>();

    for (const lead of results.flat()) {
      const existing = merged.get(lead.expaId);

      if (!existing) {
        merged.set(lead.expaId, { ...lead, products: [...lead.products] });
        continue;
      }

      merged.set(lead.expaId, {
        ...existing,
        fullName: existing.fullName || lead.fullName,
        email: existing.email ?? lead.email,
        phone: existing.phone ?? lead.phone,
        university: existing.university ?? lead.university,
        fieldOfStudy: existing.fieldOfStudy ?? lead.fieldOfStudy,
        yearOfStudy: existing.yearOfStudy ?? lead.yearOfStudy,
        source: existing.source ?? lead.source,
        products: [...new Set([...existing.products, ...lead.products])],
        // The earlier submission is when they actually first signed up.
        submittedAt:
          existing.submittedAt && lead.submittedAt
            ? (existing.submittedAt < lead.submittedAt ? existing.submittedAt : lead.submittedAt)
            : (existing.submittedAt ?? lead.submittedAt),
      });
    }

    console.log(
      `[CombinedSheetLeadRepository] ${this.sources.length} sources -> ${merged.size} unique sign-ups`,
    );

    return [...merged.values()];
  }
}
