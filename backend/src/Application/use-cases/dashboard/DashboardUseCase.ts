import {
  IDashboardRepository,
  StatusCount,
  PhaseCount,
  MemberBreakdown,
  StatusChangeTrend,
  TransitionStat,
} from '../../../Domain/abstracts/IDashboardRepository';
import { UserRole } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';

export interface DashboardCaller {
  id: string;
  role: UserRole;
  departmentId: string | null;
}

export interface BaseDashboardStats {
  statusFunnel: StatusCount[];
  phaseBreakdown: PhaseCount[];
  conversionRates: {
    contactedRate: number;
    interestedRate: number;
    approvalRate: number;
  };
  summary: {
    totalAssigned: number;
    totalContacted: number;
    totalApproved: number;
    totalRealised: number;
  };
}

export interface MemberDashboardDto extends BaseDashboardStats {}

export interface TeamLeaderDashboardDto extends BaseDashboardStats {
  memberBreakdown: MemberBreakdown[];
}

export interface VpDashboardDto extends BaseDashboardStats {
  memberLeaderboard: MemberBreakdown[]; // Same type, ordered by approvals
  trends: StatusChangeTrend[];
  transitionStats: TransitionStat[];
}

export class DashboardUseCase {
  constructor(private readonly repo: IDashboardRepository) {}

  async getMemberDashboard(caller: DashboardCaller, targetUserId: string): Promise<MemberDashboardDto> {
    // If a TL/VP is viewing a member's dashboard, ensure they are in the same department
    if (caller.role !== UserRole.MEMBER && caller.departmentId) {
    } else if (caller.role === UserRole.MEMBER && targetUserId !== caller.id) {
      throw new AppError('Members can only view their own dashboard', 403);
    }

    const scope = {
      ownerId: targetUserId,
      departmentId: caller.departmentId ?? undefined,
    };

    const statusCounts = await this.repo.getStatusCounts(scope);
    const phaseCounts = await this.repo.getPhaseCounts(scope);
        
    return this.buildBaseStats(statusCounts, phaseCounts);
  }

  async getTeamLeaderDashboard(caller: DashboardCaller): Promise<TeamLeaderDashboardDto> {
    if (caller.role !== UserRole.TEAM_LEADER && caller.role !== UserRole.VP) {
      throw new AppError('Only TLs and VPs can view team dashboards', 403);
    }
    if (!caller.departmentId) throw new AppError('No department assigned', 400);

    // Fetch personal stats for the top-level funnels
    const scope = { ownerId: caller.id, departmentId: caller.departmentId };
    
    const statusCounts = await this.repo.getStatusCounts(scope);
    const phaseCounts = await this.repo.getPhaseCounts(scope);
    
    // Fetch the member breakdown for the entire department
    const breakdown = await this.repo.getMemberBreakdown(caller.departmentId);

    const base = this.buildBaseStats(statusCounts, phaseCounts);

    return {
      ...base,
      memberBreakdown: breakdown,
    };
  }

  async getVpDashboard(
    caller: DashboardCaller,
    requestedDepartmentId?: string,
    months: number = 6
  ): Promise<VpDashboardDto> {
    if (caller.role !== UserRole.VP) {
      throw new AppError('Only VPs can view VP dashboards', 403);
    }
    
    const departmentId = requestedDepartmentId || caller.departmentId;
    if (!departmentId) throw new AppError('No department specified', 400);

    const scope = { departmentId };

    const statusCounts = await this.repo.getStatusCounts(scope);
    const phaseCounts = await this.repo.getPhaseCounts(scope);
    const leaderboard = await this.repo.getMemberBreakdown(departmentId);
    
    // Fetch trends based on dynamic months limit (default 6)
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months);
    const trends = await this.repo.getStatusChangesOverTime(departmentId, sinceDate);
    
    const transitionStats = await this.repo.getTransitionStats(departmentId);

    const base = this.buildBaseStats(statusCounts, phaseCounts);

    return {
      ...base,
      memberLeaderboard: leaderboard, // ordered by SQL query
      trends,
      transitionStats,
    };
  }

  // Helpers 

  private buildBaseStats(statusCounts: StatusCount[], phaseCounts: PhaseCount[]): BaseDashboardStats {
    let totalAssigned = 0;
    let totalContacted = 0;
    let totalInterested = 0;
    let totalApproved = 0;
    let totalRealised = 0;

    for (const sc of statusCounts) {
      totalAssigned += sc.count;
      
      // Funnel cascade (if they are approved, they must have been contacted... etc)
      // Summing the exact statuses based on the DB enum
      if (['CONTACTED', 'INTERESTED', 'APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED'].includes(sc.status)) {
        totalContacted += sc.count;
      }
      if (['INTERESTED', 'APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED'].includes(sc.status)) {
        totalInterested += sc.count;
      }
      if (['APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED'].includes(sc.status)) {
        totalApproved += sc.count;
      }
      if (['REALIZED', 'COMPLETED', 'FINISHED'].includes(sc.status)) {
        totalRealised += sc.count;
      }
    }

    return {
      statusFunnel: statusCounts,
      phaseBreakdown: phaseCounts,
      summary: {
        totalAssigned,
        totalContacted,
        totalApproved,
        totalRealised,
      },
      conversionRates: {
        contactedRate: totalAssigned > 0 ? (totalContacted / totalAssigned) * 100 : 0,
        interestedRate: totalContacted > 0 ? (totalInterested / totalContacted) * 100 : 0,
        approvalRate: totalInterested > 0 ? (totalApproved / totalInterested) * 100 : 0,
      },
    };
  }
}
