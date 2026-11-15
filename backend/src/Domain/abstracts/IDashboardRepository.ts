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

/*
    A named value and how many leads carry it. Used for the university and
    field-of-study breakdowns, which share a shape but not a meaning.
  */
export interface DimensionCount {
  label: string;
  count: number;
}

export interface DashboardScope {
  ownerId?: string;
  departmentId?: string;
  /*
    Optional window on the EP's sign-up date (createdAtExpa), so a dashboard
    can answer "this month" rather than always "since the beginning".

    Sign-up date rather than, say, when a status last changed: every figure on
    the dashboard is about a cohort of leads, and the reader picking "last
    month" means the people who arrived last month.
  */
  from?: Date;
  to?: Date;
}

/*
  How far the leads in scope have got, as a cascade: every stage counts the
  people who reached it *or anything past it*, so the numbers only ever fall.

  Which signal says a stage was reached matters, and getting it wrong is what
  made these figures disagree with each other. Two things record progress and
  they are close to disjoint:

    - the CRM flags, `contacted` and `interested`, ticked by the member
    - `statusOnExpa`, written by the EXPA sync

  The dashboard used to read only the second. But EXPA never reports CONTACTED
  or INTERESTED — in practice it only ever says LEAD or APPROVED and beyond —
  so "contacted" on the cards was really a count of approvals, the funnel's
  Contacted and Interested bars sat at zero forever, and the interested rate
  came out at exactly 100% every time. The member leaderboard meanwhile read
  only the first, so the same department's contacted figure differed depending
  on which chart you looked at.

  Each stage now takes either signal, whichever arrived. Interest implies
  contact and an approval implies both, so the cascade cannot invert when
  somebody ticks one box and not the other.
*/
export interface FunnelCounts {
  total: number;
  contacted: number;
  interested: number;
  approved: number;
  realised: number;
  completed: number;
  finished: number;
}

/*
  The counts every dashboard opens with, fetched together.

  They were four calls once, which cost four round trips to the pooler for
  work the database finishes in about four milliseconds. Over a single
  connection — which is what a serverless function holds — those trips run one
  after another and are most of what the reader waits for, so the four are
  asked for in one request instead.
*/
export interface BaseCounts {
  funnel: FunnelCounts;
  phases: PhaseCount[];
  /*
    Where the leads come from, ranked. Every distinct value with its count,
    largest first — the caller decides how long a tail to show.
  */
  universities: DimensionCount[];
  fieldsOfStudy: DimensionCount[];
}

export interface IDashboardRepository {
  getBaseCounts(scope: DashboardScope): Promise<BaseCounts>;
  /*
    Per-member performance rows for a department.
    Pass teamLeaderId to narrow it to that leader's own members; omit it for
    the full department view.

    `includeTeamLeaders` adds the Team Leaders' own pipelines to the list.
    They carry EPs like anyone else — in one department 42 contacted EPs sat
    with Team Leaders — and leaving them out meant the leaderboard did not
    add up to the department's own figures. It is off for a Team Leader
    reading their team's numbers, whose peers are not theirs to oversee, and
    on from VP upwards.
  */
  getMemberBreakdown(
    departmentId: string,
    teamLeaderId?: string,
    window?: { from?: Date; to?: Date },
    includeTeamLeaders?: boolean,
  ): Promise<MemberBreakdown[]>;
  /*
    Status changes per week. `since` is the start; `until` closes the range
    when the reader has picked a period, so the trend line covers the same
    span as everything else on the page rather than quietly showing the last
    six months beside a set of cards reading zero.
  */
  getStatusChangesOverTime(
    departmentId: string,
    since: Date,
    until?: Date,
  ): Promise<StatusChangeTrend[]>;
  getTransitionStats(departmentId: string): Promise<TransitionStat[]>;
}
