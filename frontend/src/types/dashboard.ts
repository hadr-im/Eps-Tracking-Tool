// Dashboard Types (mirrors DashboardUseCase.ts DTOs)
// Keep in sync with:
//   backend/src/Application/use-cases/dashboard/DashboardUseCase.ts
//   backend/src/Domain/abstracts/IDashboardRepository.ts

export interface StatusCount {
  status: string;
  count: number;
}

export interface PhaseCount {
  phase: string;
  count: number;
}

// Per member stats row returned by getMemberBreakdown 
export interface MemberBreakdown {
  memberId: string;
  fullName: string;
  totalAssigned: number;
  contactedCount: number;
  approvedCount: number;
  realisedCount: number;
}

export interface ConversionRates {
  contactedRate: number;
  interestedRate: number;
  approvalRate: number;
}

export interface DashboardSummary {
  totalAssigned: number;
  totalContacted: number;
  totalApproved: number;
  totalRealised: number;
}

// One data-point on the approval trend chart 
export interface StatusChangeTrend {
  // ISO date string 
  date: string;
  status: string;
  count: number;
}

// Product-to-product transition count 
export interface TransitionStat {
  fromProduct: string;
  toProduct: string;
  count: number;
}

export interface MemberDashboardDto {
  statusFunnel: StatusCount[];
  phaseBreakdown: PhaseCount[];
  conversionRates: ConversionRates;
  summary: DashboardSummary;
}

// Shape returned by GET /dashboard/department (VP only) 
export interface VpDashboardDto extends MemberDashboardDto {
  memberLeaderboard: MemberBreakdown[];
  trends: StatusChangeTrend[];
  transitionStats: TransitionStat[];
}

// API envelopes
export interface DashboardApiResponse {
  data: MemberDashboardDto;
}

export interface VpDashboardApiResponse {
  data: VpDashboardDto;
}
