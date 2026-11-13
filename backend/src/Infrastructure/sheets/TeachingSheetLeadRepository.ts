/*
  The second sign-up source: the T for Teaching form.

  Why a separate reader rather than merging the two sheets in Google Sheets.
  The obvious move is one IMPORTRANGE stacked on another, and we tried it — it
  returns blank rows without raising anything, because the Teaching sheet's
  own contents come from an IMPORTRANGE and Sheets will not chain them
  reliably. A formula that fails silently is the worst kind of data source:
  the enrichment ran happily against nothing at all.

  Doing it here instead means the two layouts stay separate and explicit, a
  moved column fails loudly, and the result can be tested before it writes.

  The two forms ask the same questions in a different order, and this one has
  no "which programme" question at all — it is the Teaching form, so every row
  is GTE by definition.
*/

import { ISheetLeadRepository } from '../../Domain/abstracts/ISheetLeadRepository';
import { SheetLead } from '../../Domain/types/SheetLead';
import { Product } from '../../Domain/enums/Product';
import { GoogleSheetsClient } from './GoogleSheetsClient';

/*
  Column positions in the Teaching sheet. Compare with the main form, where
  university sits at I and field at O: the questions match but the order does
  not, which is exactly why this cannot share the other reader's map.
*/
const COL = {
  expaId: 0,      // A
  submittedAt: 3, // D
  firstName: 4,   // E
  lastName: 5,    // F
  email: 6,       // G
  phone: 7,       // H
  // I is Gender, which we do not store.
  university: 9,  // J
  field: 10,      // K
  year: 11,       // L
  referral: 12,   // M
} as const;

// Loose matching: the real headers carry emoji and bracketed prefixes.
const HEADER_CHECKS: [number, RegExp, string][] = [
  [COL.expaId, /expa/i, 'EXPA ID'],
  [COL.email, /mail/i, 'Email'],
  [COL.phone, /phone/i, 'Phone Number'],
  [COL.university, /universit/i, 'University Name'],
  [COL.field, /field/i, 'Field Of Study'],
  [COL.year, /year/i, 'Year Of Study'],
];

function cell(row: string[], index: number): string {
  return (row[index] ?? '').toString().trim();
}

// Anything shorter is a stray value, not an id.
function validExpaId(value: string): string | null {
  return /^\d{4,}$/.test(value) ? value : null;
}

/*
  Keeps the digits and the leading +, so "29 379 778" and "+216 29379778"
  both survive as something dialable.
*/
function cleanPhone(value: string): string | null {
  const match = value.match(/\+?\d[\d\s().\-]{5,19}/);
  return match ? match[0].trim() : null;
}

/*
  "3rd year bachelor's degree (Licence)" -> 3, "Graduate" -> null.
  The first digit is the year; anything without one has no year to give.
*/
function parseYear(value: string): number | null {
  const match = value.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
}

/*
  Matches the main reader's parser rather than trusting Date: an ISO string
  demands a two-digit hour, so "2026-10-20 9:34:26" parsed as Invalid Date and
  silently became today's date.
*/
const TIMESTAMP = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/;

function parseDate(value: string): Date | null {
  if (!value) return null;
  const m = TIMESTAMP.exec(value.trim());
  if (!m) return null;
  const d = new Date(+m[1]!, +m[2]! - 1, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

export class TeachingSheetLeadRepository implements ISheetLeadRepository {
  constructor(
    private readonly client: GoogleSheetsClient = new GoogleSheetsClient(),
    private readonly spreadsheetId: string = process.env['TEACHING_SHEET_ID'] ?? '',
    private readonly range: string = process.env['TEACHING_SHEET_RANGE'] || 'A:P',
  ) {}

  // True when this source is configured at all; the enrichment skips it
  // entirely otherwise, so the app runs unchanged without it.
  isConfigured(): boolean {
    return this.spreadsheetId !== '';
  }

  async fetchAll(): Promise<SheetLead[]> {
    if (!this.isConfigured()) return [];

    const rows = await this.client.getRows(this.spreadsheetId, this.range);
    if (rows.length === 0) return [];

    /*
      The sheet may or may not carry a header row — it is a pasted copy, and
      whether row 1 holds labels depends on how it was made. An id in A means
      row 1 is data, so nothing is skipped and nothing is validated against.
    */
    const hasHeader = validExpaId(cell(rows[0]!, COL.expaId)) === null;
    if (hasHeader) this.assertHeaders(rows[0]!);

    const body = hasHeader ? rows.slice(1) : rows;

    const byExpaId = new Map<string, SheetLead>();
    let skippedNoId = 0;

    for (const row of body) {
      const expaId = validExpaId(cell(row, COL.expaId));
      if (!expaId) {
        skippedNoId++;
        continue;
      }

      byExpaId.set(expaId, {
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
        // No programme question on this form: it IS the Teaching form.
        products: [Product.GTE],
        submittedAt: parseDate(cell(row, COL.submittedAt)),
      });
    }

    console.log(
      `[TeachingSheetLeadRepository] ${rows.length} rows -> ${byExpaId.size} unique sign-ups ` +
        `(${skippedNoId} skipped for a missing or invalid EXPA ID)`,
    );

    return [...byExpaId.values()];
  }

  private assertHeaders(header: string[]): void {
    const wrong = HEADER_CHECKS.filter(([i, re]) => !re.test(cell(header, i)));
    if (wrong.length === 0) return;

    throw new Error(
      'Teaching sheet columns have moved. ' +
        wrong
          .map(([i, , label]) =>
            `expected ${label} in column ${String.fromCharCode(65 + i)} but found "${cell(header, i)}"`)
          .join('; ') +
        '. Update COL in TeachingSheetLeadRepository before running again.',
    );
  }
}
