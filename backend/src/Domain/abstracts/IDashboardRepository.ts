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
  fullName: string;
  totalAssigned: number;
  contactedCount: number;
  approvedCount: number;
  realisedCount: number;
}

export interface StatusChangeTrend {
  date: string; // ISO string representing the start of the week/month
  status: string;
  count: number;
}

export interface TransitionStat {
  fromProduct: string;
  toProduct: string;
  count: number;
}

export interface DashboardScope {
  ownerId?: string;
  departmentId?: string;
}

export interface IDashboardRepository {
  getStatusCounts(scope: DashboardScope): Promise<StatusCount[]>;
  getPhaseCounts(scope: DashboardScope): Promise<PhaseCount[]>;
  getMemberBreakdown(departmentId: string): Promise<MemberBreakdown[]>;
  // 'since' filters the history to recent data 
  getStatusChangesOverTime(departmentId: string, since: Date): Promise<StatusChangeTrend[]>;
  getTransitionStats(departmentId: string): Promise<TransitionStat[]>;
}
