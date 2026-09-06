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
export interface ApprovedEpFilters {
  product?: string;
  status?: EpStatus;
  search?: string;
}

export interface ApprovedEpsApiResponse {
  data: ApprovedEp[];
  count: number;
}
