// shape returned by GET /leads that mirrors the Ep domain entity fields exposed by GetLeadsUseCase (no ApprovedDetail)
// Keep in sync with backend EpFilters and Ep domain entity

import type { Page } from './pagination';

export interface Lead {
  id: string;
  // EXPA person id — what the UI shows. Differs from `id` on the second copy
  // of someone who belongs to two departments; null for a hand-entered lead.
  expaId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  // Both come from the sign-up sheet — EXPA knows neither.
  yearOfStudy: number | null;
  product: string;
  statusOnExpa: string;
  createdAtExpa: string;   // ISO date string
  source: string | null;
  ownerId: string | null;
  departmentId: string;
}

export type LeadsApiResponse = Page<Lead>;

// Filter params accepted by GET /leads
export interface LeadFilters {
  search?: string;        // client-side debounced full-name search
  university?: string;
  fieldOfStudy?: string;
  // Sent as a string because it comes from a select; the API parses it.
  yearOfStudy?: string;
  product?: string;
  createdFrom?: string;
  createdTo?: string;
}

// Payload for POST /dispatch
export interface DispatchPayload {
  epIds: string[];
  memberId: string;
}

export interface DispatchApiResponse {
  message: string;
  data: unknown[];
}
