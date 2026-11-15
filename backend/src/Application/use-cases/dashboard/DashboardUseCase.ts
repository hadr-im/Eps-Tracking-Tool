import {
  IDashboardRepository,
  BaseCounts,
  StatusCount,
  PhaseCount,
  MemberBreakdown,
  StatusChangeTrend,
  TransitionStat,
  DimensionCount,
} from '../../../Domain/abstracts/IDashboardRepository';
import { IAuthRepository } from '../../../Domain/abstracts/IAuthRepository';
import { UserRole, isVpLevel } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';

/*
  Optional sign-up-date window from the query string. Absent means "all time",
  which is what every dashboard did before this existed.
*/
export interface DashboardWindow {
  from?: Date;
  to?: Date;
}

export interface DashboardCaller {
  id: string;
  role: UserRole;
  departmentId: string | null;
}

export interface BaseDashboardStats {
  statusFunnel: StatusCount[];
  phaseBreakdown: PhaseCount[];
  /*
    Where this scope's leads come from, ranked largest first. Every distinct
    value is returned; the UI decides how many rows to draw and what to fold
    into "Other", because that depends on the space it has.
  */
  universityBreakdown: DimensionCount[];
  fieldOfStudyBreakdown: DimensionCount[];
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
  constructor(
    private readonly repo: IDashboardRepository,
    private readonly authRepo: IAuthRepository,
  ) {}

  async getMemberDashboard(
    caller: DashboardCaller,
    targetUserId: string,
    window: DashboardWindow = {},
  ): Promise<MemberDashboardDto> {
    await this.assertCanViewDashboardOf(caller, targetUserId);

    const scope = {
      ownerId: targetUserId,
      departmentId: caller.departmentId ?? undefined,
      ...window,
    };

    return this.buildBaseStats(await this.repo.getBaseCounts(scope));
  }

  async getTeamLeaderDashboard(
    caller: DashboardCaller,
    window: DashboardWindow = {},
  ): Promise<TeamLeaderDashboardDto> {
    if (caller.role !== UserRole.TEAM_LEADER && !isVpLevel(caller.role)) {
      throw new AppError('Only TLs and VPs can view team dashboards', 403);
    }
    if (!caller.departmentId) throw new AppError('No department assigned', 400);

    // Fetch personal stats for the top-level funnels
    const scope = { ownerId: caller.id, departmentId: caller.departmentId, ...window };
    
    /*
      The breakdown covers the whole department, for a Team Leader as much as
      a VP. Team Leaders dispatch to anyone in the department, so limiting the
      figures to their own team showed them a slice of work they are not
      actually confined to.
    */
    const [counts, breakdown] = await Promise.all([
      this.repo.getBaseCounts(scope),
      // Team Leaders' own pipelines show for a VP reading this, not for a
      // Team Leader reading their own team.
      this.repo.getMemberBreakdown(caller.departmentId, undefined, window, isVpLevel(caller.role)),
    ]);

    return {
      ...this.buildBaseStats(counts),
      memberBreakdown: breakdown,
    };
  }

  async getVpDashboard(
    caller: DashboardCaller,
    requestedDepartmentId?: string,
    months: number = 6,
    window: DashboardWindow = {},
  ): Promise<VpDashboardDto> {
    if (!isVpLevel(caller.role)) {
      throw new AppError('Only VPs can view VP dashboards', 403);
    }

    /*
      A VP only ever sees their own department.

      This used to accept any departmentId from the query string, which would
      have returned another department's numbers to anyone who asked. The UI
      never sent it, so honouring it was an open door nobody walked through.
      A request for someone else's department is now refused outright rather
      than silently ignored, so a wrong caller finds out.
    */
    const departmentId = caller.departmentId;
    if (!departmentId) throw new AppError('No department assigned to your account', 400);

    if (requestedDepartmentId && requestedDepartmentId !== departmentId) {
      throw new AppError('You can only view your own department', 403);
    }

    const scope = { departmentId, ...window };

    /*
      How far back the trend line reaches.

      A chosen period wins over the months count: picking "Yesterday" and
      still being shown six months of approvals beside four cards reading
      zero is the page contradicting itself. With no period chosen it falls
      back to the months count, which is the old behaviour.
    */
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months);
    const trendsFrom = window.from ?? sinceDate;

    /*
      Issued together rather than one after another. These four were awaited in
      sequence, so the page waited for four full round trips to the database
      even though none of them depends on the one before it.
    */
    const [counts, leaderboard, trends, transitionStats] = await Promise.all([
      this.repo.getBaseCounts(scope),
      this.repo.getMemberBreakdown(departmentId, undefined, window, true),
      this.repo.getStatusChangesOverTime(departmentId, trendsFrom, window.to),
      this.repo.getTransitionStats(departmentId),
    ]);

    return {
      ...this.buildBaseStats(counts),
      memberLeaderboard: leaderboard, // ordered by SQL query
      trends,
      transitionStats,
    };
  }

  // Helpers

  /*
    Who may read someone else's numbers.

    Replaces an empty `if` block that left this endpoint with no check at all:
    any TL or VP could read any user's dashboard, in any department. Mirrors
    the EP visibility rules so the two cannot drift apart.
  */
  private async assertCanViewDashboardOf(
    caller: DashboardCaller,
    targetUserId: string,
  ): Promise<void> {
    if (targetUserId === caller.id) return;

    if (!caller.departmentId) {
      throw new AppError('No department assigned to your account', 400);
    }

    const target = await this.authRepo.findById(targetUserId);
    if (!target) throw new AppError('Member not found', 404);

    if (target.departmentId !== caller.departmentId) {
      throw new AppError('That member is not in your department', 403);
    }

    /*
      Anyone in the department may read anyone else's dashboard. These are
      aggregate counts — how many leads contacted, how many approved — which
      the department already discusses openly, and seeing them is what makes
      the leaderboard mean anything.

      The department check above is the real boundary and applies to every
      role including a member. CRM access is NOT widened by this: the EP
      endpoints keep their own, stricter rule, so a member still cannot read
      another member's notes or contact details.
    */
  }

  private buildBaseStats(counts: BaseCounts): BaseDashboardStats {
    const f = counts.funnel;

    /*
      The funnel the chart draws, as stages rather than as a tally of each
      EXPA status.

      It used to send the raw status distribution — one bucket per value of
      statusOnExpa — under the name "Pipeline Funnel". Two of those buckets
      could never fill: the sync only ever writes LEAD or APPROVED and beyond,
      so Contacted and Interested were drawn as empty every single time, on
      every dashboard, while the work they represent was sitting in the CRM
      columns the chart never looked at.

      These are cumulative, which is what a funnel means: 'Contacted' is
      everyone contacted, including those since approved, not the ones who got
      no further.
    */
    const statusFunnel: StatusCount[] = [
      { status: 'LEAD', count: f.total },
      { status: 'CONTACTED', count: f.contacted },
      { status: 'INTERESTED', count: f.interested },
      { status: 'APPROVED', count: f.approved },
      { status: 'REALIZED', count: f.realised },
      { status: 'COMPLETED', count: f.completed },
      { status: 'FINISHED', count: f.finished },
    ];

    return {
      statusFunnel,
      phaseBreakdown: counts.phases,
      universityBreakdown: counts.universities,
      fieldOfStudyBreakdown: counts.fieldsOfStudy,
      summary: {
        totalAssigned: f.total,
        totalContacted: f.contacted,
        totalApproved: f.approved,
        totalRealised: f.realised,
      },
      /*
        Each rate is a step of the cascade against the step before it, so it
        reads as "of the people who got this far, how many went on". The
        interested rate was previously interested-over-contacted where both
        sides counted the same approvals, which is why it was pinned at 100%.
      */
      conversionRates: {
        contactedRate: f.total > 0 ? (f.contacted / f.total) * 100 : 0,
        interestedRate: f.contacted > 0 ? (f.interested / f.contacted) * 100 : 0,
        approvalRate: f.interested > 0 ? (f.approved / f.interested) * 100 : 0,
      },
    };
  }
}
