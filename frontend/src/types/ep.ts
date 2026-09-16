// EP Types: mirrors backend Domain entities and enums
// Keep in sync with:
//   backend/src/Domain/entities/Ep.ts
//   backend/src/Domain/enums/*

// Enums 

export type EpStatus =
  | 'LEAD'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'APPROVED'
  | 'REALIZED'
  | 'COMPLETED'
  | 'FINISHED';

export type TrackingPhase =
  | 'WAITING_FOR_ANSWER'
  | 'EP_NOT_RESPONDING'
  | 'EXPLAINING_AIESEC'
  | 'LOOKING_FOR_OPPORTUNITIES'
  | 'HAVING_INTERVIEW'
  | 'WILL_SIGN_CONTRACT'
  | 'CONTRACT_SIGNED'
  | 'WAITING_FOR_CV'
  | 'NOT_INTERESTED_ANYMORE';

export type Duration = 'LONG' | 'MID' | 'SHORT';

export type Availability =
  | 'THIS_SUMMER'
  | 'THIS_WINTER'
  | 'NEXT_SUMMER'
  | 'NEXT_WINTER';

// Core Entity 

export interface Ep {
  // Identity
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;

  // Academic
  university: string | null;
  fieldOfStudy: string | null;
  yearOfStudy: number | null;

  // EXPA metadata
  product: string;
  departmentId: string;
  statusOnExpa: EpStatus;
  createdAtExpa: string; // ISO date string from API

  // CRM fields (set by members)
  ownerId: string | null;
  assignedAt: string | null;
  source: string | null;
  cvLink: string | null;
  contacted: boolean;
  contactedAt: string | null;
  interested: boolean;
  trackingPhase: TrackingPhase | null;
  notes: string | null;
  duration: Duration | null;
  availability: Availability | null;
}

// Update Payload 
// Partial: only CRM fields that a MEMBER can edit
// Mirrors EpUpdateData in backend/src/Application/use-cases/ep/EpUpdateData.ts

export interface EpUpdatePayload {
  source?: string | null;
  cvLink?: string | null;
  contacted?: boolean;
  interested?: boolean;
  trackingPhase?: TrackingPhase | null;
  notes?: string | null;
  duration?: Duration | null;
  availability?: Availability | null;
}

// Filter Params 
// Synced to URL search params in CrmFilters.tsx
// Sent as query params to GET /eps

export interface EpFilters {
  search?: string;          // client-side fullName search (debounced)
  trackingPhase?: TrackingPhase;
  contacted?: 'true' | 'false';
  interested?: 'true' | 'false';
  duration?: Duration;
}

//  API Response 

export interface EpsApiResponse {
  data: Ep[];
  count: number;
}

export interface TransitionHistoryDto {
  id: string;
  epId: string;
  epName: string;
  epEmail: string | null;
  epPhone: string | null;
  epUniversity: string | null;
  epFieldOfStudy: string | null;
  triggeredByName: string;
  fromProduct: string | null;
  toProduct: string | null;
  note: string | null;
  createdAt: string;
  direction: 'INBOUND' | 'OUTBOUND';
}

export interface TransitionsApiResponse {
  data: TransitionHistoryDto[];
  count: number;
}
