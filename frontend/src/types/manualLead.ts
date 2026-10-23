// Manual leads — EPs entered by hand rather than pulled in by the EXPA sync.
// Keep in sync with:
//   backend/src/Application/use-cases/dispatch/ManualLeadUseCase.ts

import type { Lead } from './lead';

// A manual lead is an ordinary EP row; the page only ever shows unassigned ones.
export type ManualLead = Lead;

export interface ManualLeadsApiResponse {
  data: ManualLead[];
  count: number;
}

// What the form sends. Department, product and status are decided server-side.
export interface ManualLeadPayload {
  // Present when the lead was looked up on EXPA; the record then keeps that id
  // so the hourly status sync tracks it.
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

// Prefill returned by the EXPA lookup — nothing is saved until the user confirms.
export interface ExpaLookupResult {
  expaId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  createdAtExpa: string;
  statusOnExpa: string;
  alreadyExists: boolean;
}

export interface ExpaLookupApiResponse {
  data: ExpaLookupResult;
}

export interface ManualLeadApiResponse {
  data: ManualLead;
}
