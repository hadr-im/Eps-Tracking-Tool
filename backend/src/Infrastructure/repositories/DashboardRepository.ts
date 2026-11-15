import { PrismaClient } from '@prisma/client';
import {
  IDashboardRepository,
  DashboardScope,
  BaseCounts,
  FunnelCounts,
  PhaseCount,
  MemberBreakdown,
  StatusChangeTrend,
  TransitionStat,
  DimensionCount,
} from '../../Domain/abstracts/IDashboardRepository';
import { prisma } from '../Database/PrismaService';

export class DashboardRepository implements IDashboardRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /*
    Status, phase, university and field-of-study counts in a single round trip.

    Each used to be its own groupBy. The database answers all four in about
    four milliseconds together, but a serverless function holds one pooled
    connection, so four calls meant four sequential waits of roughly a tenth
    of a second each — the queries were never the slow part, the trips were.

    The scope rows are gathered once in a CTE and then grouped four ways.
    Written as `(param IS NULL OR column = param)` so one statement serves the
    personal, team and department dashboards; Postgres folds away the branches
    that are null at plan time.

    Both text dimensions are trimmed *before* grouping, which the old version
    did afterwards in JavaScript — long enough for "ENIT" and "ENIT " to
    survive as two rows that then printed the same label twice.

    ── What a period means ──────────────────────────────────────────────────

    With no period chosen, this is a picture of the world as it stands: every
    EP in scope, and how far each has got.

    With a period chosen, it is a picture of the work done in that period.
    Each stage counts the EPs whose own event for that stage falls inside it —
    assigned by `assignedAt`, contacted by `contactedAt`, approved and
    realised by the dates EXPA gives the application.

    The period used to filter on `createdAtExpa`, the EXPA sign-up date, which
    answers a different question: how is the batch who signed up then getting
    on. Both are fair questions, but nobody reading "Yesterday" on a dashboard
    means the first — and since sign-ups arrive in bursts, a day with no new
    leads showed zeroes across a page while a hundred EPs had been contacted
    that day.

    A consequence worth knowing: in period mode the stages no longer nest. An
    EP approved yesterday was contacted weeks ago, so Approved can exceed
    Contacted for that day. They are counts of events, not a funnel, and the
    page says so when a period is on.
  */
  async getBaseCounts(scope: DashboardScope): Promise<BaseCounts> {
    const departmentId = scope.departmentId ?? null;
    const ownerId = scope.ownerId ?? null;
    const from = scope.from ?? null;
    const to = scope.to ?? null;
    const windowed = !!(scope.from || scope.to);

    const [row] = (await this.db.$queryRaw`
      WITH scoped AS (
        SELECT
          e."statusOnExpa"::text AS status,
          e."contacted" AS crm_contacted,
          e."interested" AS crm_interested,
          e."trackingPhase"::text AS phase,
          NULLIF(BTRIM(e."university"), '') AS university,
          NULLIF(BTRIM(e."fieldOfStudy"), '') AS field,
          /*
            Did each event happen inside the chosen period? An open end is
            treated as unbounded, and a row with no such date never counts —
            COALESCE turns the NULL that BETWEEN yields into a plain false so
            it cannot poison the OR below.
          */
          COALESCE(e."assignedAt"     BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                          AND COALESCE(${to}::timestamp, 'infinity'), false) AS assigned_in,
          COALESCE(e."contactedAt"    BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                          AND COALESCE(${to}::timestamp, 'infinity'), false) AS contacted_in,
          COALESCE(ad."approvalDate"  BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                          AND COALESCE(${to}::timestamp, 'infinity'), false) AS approved_in,
          COALESCE(ad."realizedDate"  BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                          AND COALESCE(${to}::timestamp, 'infinity'), false) AS realised_in,
          COALESCE(ad."completedDate" BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                          AND COALESCE(${to}::timestamp, 'infinity'), false) AS completed_in,
          COALESCE(ad."finishedDate"  BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                          AND COALESCE(${to}::timestamp, 'infinity'), false) AS finished_in
        FROM "Ep" e
        LEFT JOIN "ApprovedDetail" ad ON ad."epId" = e.id
        WHERE (${departmentId}::text IS NULL OR e."departmentId" = ${departmentId}::text)
          AND (${ownerId}::text IS NULL OR e."ownerId" = ${ownerId}::text)
      ),
      /*
        Which rows the breakdowns describe. With a period on, that is the EPs
        touched in it — picked up, spoken to, or approved — so the charts
        describe the work being discussed rather than the whole back catalogue.
      */
      relevant AS (
        SELECT *, (NOT ${windowed}::boolean OR assigned_in OR contacted_in OR approved_in) AS touched
        FROM scoped
      )
      SELECT
        (
          /*
            Without a period: a cascade. Each stage counts everyone who
            reached it or went past it, and either signal counts — the
            member's CRM tick or the status EXPA reports — because EXPA never
            reports the middle of the pipeline and the tick is often the only
            record that the conversation happened. Interest implies contact
            and an approval implies both, so the line cannot go back up when
            one box is ticked and the other is not.

            With a period: what happened in it, stage by stage.

            Interest is the one stage with no timestamp of its own — there is
            no "interestedAt" column — so within a period it follows the
            contact date, which is when the member ticked both.
          */
          SELECT json_build_object(
            'total',      COUNT(*) FILTER (
                            WHERE CASE WHEN ${windowed}::boolean THEN assigned_in ELSE true END
                          )::int,
            'contacted',  COUNT(*) FILTER (
                            WHERE CASE WHEN ${windowed}::boolean
                                  THEN contacted_in
                                  ELSE crm_contacted OR crm_interested OR status <> 'LEAD' END
                          )::int,
            'interested', COUNT(*) FILTER (
                            WHERE CASE WHEN ${windowed}::boolean
                                  THEN crm_interested AND contacted_in
                                  ELSE crm_interested
                                    OR status IN ('APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED') END
                          )::int,
            'approved',   COUNT(*) FILTER (
                            WHERE CASE WHEN ${windowed}::boolean
                                  THEN approved_in
                                  ELSE status IN ('APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED') END
                          )::int,
            'realised',   COUNT(*) FILTER (
                            WHERE CASE WHEN ${windowed}::boolean
                                  THEN realised_in
                                  ELSE status IN ('REALIZED', 'COMPLETED', 'FINISHED') END
                          )::int,
            'completed',  COUNT(*) FILTER (
                            WHERE CASE WHEN ${windowed}::boolean
                                  THEN completed_in
                                  ELSE status IN ('COMPLETED', 'FINISHED') END
                          )::int,
            'finished',   COUNT(*) FILTER (
                            WHERE CASE WHEN ${windowed}::boolean
                                  THEN finished_in
                                  ELSE status = 'FINISHED' END
                          )::int
          )
          FROM scoped
        ) AS funnel,
        (
          SELECT COALESCE(json_agg(json_build_object('phase', phase, 'count', n)), '[]'::json)
          FROM (SELECT phase, COUNT(*)::int AS n FROM relevant WHERE touched AND phase IS NOT NULL GROUP BY phase) p
        ) AS phases,
        (
          SELECT COALESCE(json_agg(json_build_object('label', university, 'count', n) ORDER BY n DESC), '[]'::json)
          FROM (SELECT university, COUNT(*)::int AS n FROM relevant WHERE touched AND university IS NOT NULL GROUP BY university) u
        ) AS universities,
        (
          SELECT COALESCE(json_agg(json_build_object('label', field, 'count', n) ORDER BY n DESC), '[]'::json)
          FROM (SELECT field, COUNT(*)::int AS n FROM relevant WHERE touched AND field IS NOT NULL GROUP BY field) f
        ) AS "fieldsOfStudy"
    `) as [
      {
        funnel: FunnelCounts;
        phases: PhaseCount[];
        universities: DimensionCount[];
        fieldsOfStudy: DimensionCount[];
      },
    ];

    const empty: FunnelCounts = {
      total: 0,
      contacted: 0,
      interested: 0,
      approved: 0,
      realised: 0,
      completed: 0,
      finished: 0,
    };

    return {
      funnel: row?.funnel ?? empty,
      phases: row?.phases ?? [],
      universities: row?.universities ?? [],
      fieldsOfStudy: row?.fieldsOfStudy ?? [],
    };
  }

  async getMemberBreakdown(
    departmentId: string,
    teamLeaderId?: string,
    window?: { from?: Date; to?: Date },
    includeTeamLeaders = false,
  ): Promise<MemberBreakdown[]> {
    // Because the dataset is huge, a single raw SQL query is used to conditionally count
    // directly in PostgreSQL, returning only the small set of final numbers
    //
    // The teamLeaderId predicate is written so that passing undefined matches
    // every member, keeping this to one query instead of two near-identical ones.
    //
    /*
      The period means the same thing here as on the cards above: each column
      counts the EPs whose own event landed inside it, not the EPs that
      happened to sign up then. The join is left unfiltered by date and the
      windowing moved into each FILTER, so a member who contacted twenty
      people yesterday shows twenty however old those leads are, and still
      appears on the board with a row of zeroes if they did nothing.
    */
    const from = window?.from ?? null;
    const to = window?.to ?? null;
    const windowed = !!(window?.from || window?.to);

    const result = await this.db.$queryRaw`
      SELECT
        u.id AS "memberId",
        u."fullName" AS "fullName",
        COUNT(e.id) FILTER (
          WHERE CASE WHEN ${windowed}::boolean
                THEN COALESCE(e."assignedAt" BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                                 AND COALESCE(${to}::timestamp, 'infinity'), false)
                ELSE true END
        )::int AS "totalAssigned",
        /*
          The same rule the summary cards use. This counted only the CRM tick,
          which left a member's approved EPs out of their own contacted figure
          and put the leaderboard at odds with every other number on the page.
        */
        COUNT(e.id) FILTER (
          WHERE CASE WHEN ${windowed}::boolean
                THEN COALESCE(e."contactedAt" BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                                  AND COALESCE(${to}::timestamp, 'infinity'), false)
                ELSE e.contacted OR e.interested OR e."statusOnExpa" <> 'LEAD' END
        )::int AS "contactedCount",
        COUNT(e.id) FILTER (
          WHERE CASE WHEN ${windowed}::boolean
                THEN COALESCE(ad."approvalDate" BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                                    AND COALESCE(${to}::timestamp, 'infinity'), false)
                ELSE e."statusOnExpa" IN ('APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED') END
        )::int AS "approvedCount",
        COUNT(e.id) FILTER (
          WHERE CASE WHEN ${windowed}::boolean
                THEN COALESCE(ad."realizedDate" BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                                    AND COALESCE(${to}::timestamp, 'infinity'), false)
                ELSE e."statusOnExpa" IN ('REALIZED', 'COMPLETED', 'FINISHED') END
        )::int AS "realisedCount"
      FROM "User" u
      LEFT JOIN "Ep" e ON e."ownerId" = u.id
      LEFT JOIN "ApprovedDetail" ad ON ad."epId" = e.id
      WHERE u."departmentId" = ${departmentId}
        AND (u.role = 'MEMBER' OR (${includeTeamLeaders}::boolean AND u.role = 'TEAM_LEADER'))
        AND u."isDisabled" = false
        AND (${teamLeaderId ?? null}::text IS NULL OR u."teamLeaderId" = ${teamLeaderId ?? null}::text)
      GROUP BY u.id, u."fullName"
      ORDER BY "approvedCount" DESC, "contactedCount" DESC
    `;

    return result as MemberBreakdown[];
  }

  async getStatusChangesOverTime(
    departmentId: string,
    since: Date,
    until?: Date,
  ): Promise<StatusChangeTrend[]> {
    // Groups history logs by the week they occurred in
    const result = await this.db.$queryRaw`
      SELECT
        DATE_TRUNC('week', sh."changedAt")::text AS date,
        sh."toStatus"::text AS status,
        COUNT(sh.id)::int AS count
      FROM "StatusHistory" sh
      JOIN "Ep" e ON e.id = sh."epId"
      WHERE e."departmentId" = ${departmentId}
        AND sh."changedAt" >= ${since}
        AND (${until ?? null}::timestamp IS NULL OR sh."changedAt" <= ${until ?? null}::timestamp)
      GROUP BY DATE_TRUNC('week', sh."changedAt"), sh."toStatus"
      ORDER BY DATE_TRUNC('week', sh."changedAt") ASC
    `;

    return result as StatusChangeTrend[];
  }

  async getTransitionStats(departmentId: string): Promise<TransitionStat[]> {
    const rows = await this.db.transitionHistory.groupBy({
      by: ['fromProduct', 'toProduct'],
      where: {
        toDepartment: departmentId,
        fromProduct: { not: null },
        toProduct: { not: null },
      },
      _count: { id: true },
    });

    return rows.map((r) => ({
      fromProduct: r.fromProduct as string,
      toProduct: r.toProduct as string,
      count: r._count.id,
    }));
  }
}
