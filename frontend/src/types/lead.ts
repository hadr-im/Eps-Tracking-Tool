// shape returned by GET /leads that mirrors the Ep domain entity fields exposed by GetLeadsUseCase (no ApprovedDetail)
// Keep in sync with backend EpFilters and Ep domain entity

export interface Lead {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  product: string;
  statusOnExpa: string;
  createdAtExpa: string;   // ISO date string
  source: string | null;
  ownerId: string | null;
  departmentId: string;
}

export interface LeadsApiResponse {
  data: Lead[];
  count: number;
}

// Filter params accepted by GET /leads
export interface LeadFilters {
  search?: string;        // client-side debounced full-name search
  university?: string;
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
