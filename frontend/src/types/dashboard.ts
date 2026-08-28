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

export interface MemberBreakdown {
  memberId: string;
  memberName: string;
  totalAssigned: number;
  totalContacted: number;
  totalApproved: number;
  totalRealised: number;
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

export interface MemberDashboardDto {
  statusFunnel: StatusCount[];
  phaseBreakdown: PhaseCount[];
  conversionRates: ConversionRates;
  summary: DashboardSummary;
}

// API envelope
export interface DashboardApiResponse {
  data: MemberDashboardDto;
}
