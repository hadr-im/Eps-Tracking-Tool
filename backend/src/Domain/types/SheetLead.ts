import { Product } from '../enums/Product';

/*
  One sign-up form submission, already cleaned.

  The sheet is the only place the real email and phone number exist — EXPA
  hands back a relay address (@inbound.aiesec.org) and no phone at all.
*/
export interface SheetLead {
  // Column A. Always digits; rows whose id cell holds an API error are dropped.
  expaId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  yearOfStudy: number | null;
  // Column K, the referral — "Information booth on campus", "Instagram", …
  source: string | null;
  // Column J, which may name more than one internship type.
  products: Product[];
  // Column D, used to keep the most recent of several submissions.
  submittedAt: Date | null;
}
