import { ISheetLeadRepository } from '../../Domain/abstracts/ISheetLeadRepository';
import { SheetLead } from '../../Domain/types/SheetLead';
import { Product } from '../../Domain/enums/Product';
import { GoogleSheetsClient } from './GoogleSheetsClient';

/*
  Reads the sign-up form responses and cleans them.

  Column positions, not header names: the headers carry emoji and stray
  whitespace that change whenever someone edits the form. Positions are
  verified once against the header row so a reordered sheet fails loudly
  instead of quietly writing phone numbers into the email column — which is a
  mistake the previous Apps Script version actually made.
*/

// 0-based, matching the sheet's A..Q.
const COL = {
  expaId: 0,      // A
  submittedAt: 3, // D
  firstName: 4,   // E
  lastName: 5,    // F
  email: 6,       // G
  phone: 7,       // H
  university: 8,  // I
  type: 9,        // J
  referral: 10,   // K
  field: 14,      // O
  year: 15,       // P
} as const;

// Loose contains-matching, because the real headers look like
// "🌍 Type of abroad internship" and " 📚 Field Of Study".
const HEADER_CHECKS: [number, RegExp, string][] = [
  [COL.expaId, /expa/i, 'EXPA ID'],
  [COL.email, /mail/i, 'Email'],
  [COL.phone, /phone/i, 'Phone Number'],
  [COL.type, /internship|abroad/i, 'Type of abroad internship'],
  [COL.field, /field/i, 'Field Of Study'],
  [COL.year, /year/i, 'Year Of Study'],
];

const TYPE_TO_PRODUCT: [RegExp, Product][] = [
  [/volunteer/i, Product.GV],
  [/professional/i, Product.GTA],
  [/teach/i, Product.GTE],
];

function cell(row: string[], index: number): string {
  return (row[index] ?? '').toString().trim();
}

/*
  An EXPA id is a run of digits. This column sometimes holds an API error
  instead, e.g. "Error: Request failed for https://api.aiesec.org returned
  code 401", and those rows must never become people.
*/
function validExpaId(value: string): string | null {
  return /^\d{4,}$/.test(value) ? value : null;
}

/*
  People paste anything into a phone field — one submission has a whole
  paragraph after the number. Keep the first plausible phone and discard the
  rest rather than storing an essay.
*/
function cleanPhone(value: string): string | null {
  if (!value) return null;
  const match = value.match(/\+?\d[\d\s().\-]{5,19}/);
  return match ? match[0].trim() : null;
}

// "2nd year bachelor's degree (Licence)" -> 2
function parseYear(value: string): number | null {
  const match = value.match(/(\d+)\s*(?:st|nd|rd|th)?\s*year/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
}

// Column J can name several types, so this matches on contains, not equals.
function parseProducts(value: string): Product[] {
  return TYPE_TO_PRODUCT.filter(([re]) => re.test(value)).map(([, p]) => p);
}

/*
  Parses the sheet's "2026-01-26 9:20:21".

  Not `new Date(value.replace(' ', 'T'))`: ISO 8601 demands a two-digit hour,
  so any submission before 10am produced an Invalid Date. That silently became
  a null timestamp, which then defeated the date cutoff and left the lead with
  today's date as its sign-up date. Parsing the parts explicitly avoids
  depending on the engine's tolerance for almost-ISO strings.

  Built in local time, which is how the sheet records it.
*/
const TIMESTAMP = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/;

function parseDate(value: string): Date | null {
  if (!value) return null;

  const m = TIMESTAMP.exec(value.trim());
  if (!m) return null;

  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4] ?? 0),
    Number(m[5] ?? 0),
    Number(m[6] ?? 0),
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

export class SheetLeadRepository implements ISheetLeadRepository {
  /*
    Returns every submission, with no date filter.

    The cutoff belongs to the caller, not here: it decides which sign-ups are
    recent enough to become new leads, but an existing lead should be enriched
    from the sheet however long ago they signed up. Filtering at this level
    conflated the two and left old leads stuck with a relay email and no phone
    even though the sheet held both.
  */
  constructor(
    private readonly client: GoogleSheetsClient = new GoogleSheetsClient(),
    private readonly spreadsheetId: string = process.env['LEADS_SHEET_ID'] ?? '',
    private readonly range: string = process.env['LEADS_SHEET_RANGE'] || 'A:Q',
  ) {
    if (!this.spreadsheetId) throw new Error('Missing LEADS_SHEET_ID');
  }

  async fetchAll(): Promise<SheetLead[]> {
    const rows = await this.client.getRows(this.spreadsheetId, this.range);
    if (rows.length === 0) return [];

    this.assertHeaders(rows[0]!);

    /*
      One person can submit the form more than once. Keep the most recent, so
      a corrected phone number wins over the original.
    */
    const byExpaId = new Map<string, SheetLead>();
    let skippedNoId = 0;

    for (const row of rows.slice(1)) {
      const expaId = validExpaId(cell(row, COL.expaId));
      if (!expaId) {
        skippedNoId++;
        continue;
      }

      const submittedAt = parseDate(cell(row, COL.submittedAt));

      const lead: SheetLead = {
        expaId,
        fullName: [cell(row, COL.firstName), cell(row, COL.lastName)]
          .filter(Boolean)
          .join(' '),
        email: cell(row, COL.email) || null,
        phone: cleanPhone(cell(row, COL.phone)),
        university: cell(row, COL.university) || null,
        fieldOfStudy: cell(row, COL.field) || null,
        yearOfStudy: parseYear(cell(row, COL.year)),
        source: cell(row, COL.referral) || null,
        products: parseProducts(cell(row, COL.type)),
        submittedAt,
      };

      const existing = byExpaId.get(expaId);
      if (existing) {
        const a = existing.submittedAt?.getTime() ?? 0;
        const b = lead.submittedAt?.getTime() ?? 0;
        if (b < a) continue; // keep the newer submission
      }
      byExpaId.set(expaId, lead);
    }

    console.log(
      `[SheetLeadRepository] ${rows.length - 1} rows -> ${byExpaId.size} unique sign-ups ` +
        `(${skippedNoId} skipped for a missing or invalid EXPA ID)`,
    );

    return [...byExpaId.values()];
  }

  private assertHeaders(header: string[]): void {
    const wrong = HEADER_CHECKS.filter(([i, re]) => !re.test(cell(header, i)));
    if (wrong.length === 0) return;

    throw new Error(
      'Sign-up sheet columns have moved. ' +
        wrong
          .map(([i, , label]) => `expected ${label} in column ${String.fromCharCode(65 + i)} but found "${cell(header, i)}"`)
          .join('; ') +
        '. Update COL in SheetLeadRepository before running again.',
    );
  }
}
