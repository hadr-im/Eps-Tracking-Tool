import type { Page } from './pagination';

// ApprovedEp types
// Mirrors the EpDetailDto returned by GET /approved-eps
// Keep in sync with:
//   backend/src/Application/use-cases/ep/GetApprovedEpsWithDetailUseCase.ts -> EpDetailDto

import type { EpStatus } from './ep';

export interface ApprovedEpDetail {
  expaAppId: string;
  opportunityTitle: string | null;
  hostingMC: string | null;
  hostingLC: string | null;
  projectFees: number | null;
  // Approval date (ISO string) 
  approvalDate: string | null;
  // Realised date (ISO string) 
  realizedDate: string | null;
  completedDate: string | null;
  finishedDate: string | null;
  contractLink: string | null;
  auditFolder: string | null;
}

export interface ApprovedEp {
  id: string;
  // EXPA person id — what the UI shows. See lead.ts for the full note.
  expaId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  product: string;
  statusOnExpa: EpStatus;
  createdAtExpa: string;
  syncedAt: string;
  // ID of the member who owned this EP in the pipeline 
  ownerId: string | null;
  // Display name of the owning member (joined server-side) 
  memberName: string | null;
  // Null if the ApprovedDetail record hasn't been synced yet 
  approvedDetail: ApprovedEpDetail | null;
}

// Filter params sent to GET /approved-eps
/*
  No product filter. Approvals belong to the department the caller signs in
  under, and the backend resolves that from the token rather than the query
  string — a GV lead is not something the GTa tracker should be able to reach.
*/
export interface ApprovedEpFilters {
  status?: EpStatus;
  search?: string;
  university?: string;
  createdFrom?: string;
  createdTo?: string;
}

export type ApprovedEpsApiResponse = Page<ApprovedEp>;
