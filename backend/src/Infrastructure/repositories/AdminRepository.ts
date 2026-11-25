import { PrismaClient } from '@prisma/client';
import {
  IAdminRepository,
  CompletionRow,
  CompletionRollup,
  CompletionWindow,
  ExpaUsage,
  ExpaUsagePoint,
  ExpaRange,
} from '../../Domain/abstracts/IAdminRepository';
import { prisma } from '../Database/PrismaService';

/*
  A lead assigned less recently than this is fair to score. Anything newer is
  still in the member's inbox rather than on their conscience.
*/
const GRACE_HOURS = Number(process.env['COMPLETION_GRACE_HOURS'] ?? 24);

/*
  The phases that mean a conversation actually started. Reaching one of these
  is what makes duration, availability and a CV answerable at all.
*/
/*
  Programmes that do not ask for a CV.

  Global Volunteer takes people without one, so counting a missing CV
  against a GV lead marks a member down for a document the process never
  requested — and, worse, makes the GV department look permanently behind
  the other two on a field it does not use. GV EPs are left out of both
  sides of that fraction rather than counted as filled, so the figure stays
  a fraction of what was actually expected.
*/
const NO_CV_PRODUCTS = ['GV'];

const ENGAGED_PHASES = [
  'EXPLAINING_AIESEC',
  'LOOKING_FOR_OPPORTUNITIES',
  'HAVING_INTERVIEW',
  'WILL_SIGN_CONTRACT',
  'CONTRACT_SIGNED',
  'WAITING_FOR_CV',
];

/*
  One row per user, counting fields filled against fields expected.

  Written as a single statement rather than per-user queries: a committee is
  seventy people and the page shows all of them at once. Every member is kept
  even with nothing assigned, so a name missing from the table always means
  the account is gone rather than the person being idle.

  `notes` and `cvLink` count as filled only when they hold something other
  than whitespace — an empty string is what a cleared textarea leaves behind,
  and it is not an answer.
*/
function completionSelect(alias = 'e'): string {
  const engaged = ENGAGED_PHASES.map((p) => `'${p}'`).join(', ');
  const noCv = NO_CV_PRODUCTS.map((p) => `'${p}'`).join(', ');
  return `
    -- always expected
    COUNT(${alias}.id)                                                        AS exp_contacted,
    COUNT(${alias}.id) FILTER (WHERE ${alias}."contacted")                    AS fil_contacted,
    COUNT(${alias}.id)                                                        AS exp_phase,
    COUNT(${alias}.id) FILTER (WHERE ${alias}."trackingPhase" IS NOT NULL)    AS fil_phase,
    COUNT(${alias}.id)                                                        AS exp_notes,
    COUNT(${alias}.id) FILTER (WHERE BTRIM(COALESCE(${alias}."notes", '')) <> '') AS fil_notes,
    -- expected only once the conversation is live
    COUNT(${alias}.id) FILTER (WHERE ${alias}."trackingPhase"::text IN (${engaged})) AS exp_duration,
    COUNT(${alias}.id) FILTER (WHERE ${alias}."trackingPhase"::text IN (${engaged}) AND ${alias}."duration" IS NOT NULL) AS fil_duration,
    COUNT(${alias}.id) FILTER (WHERE ${alias}."trackingPhase"::text IN (${engaged})) AS exp_availability,
    COUNT(${alias}.id) FILTER (WHERE ${alias}."trackingPhase"::text IN (${engaged}) AND ${alias}."availability" IS NOT NULL) AS fil_availability,
    -- A CV is not asked for on Global Volunteer, so GV EPs are not counted
    -- against it at all; see NO_CV_PRODUCTS.
    COUNT(${alias}.id) FILTER (WHERE ${alias}."trackingPhase"::text IN (${engaged}) AND ${alias}."product"::text NOT IN (${noCv})) AS exp_cv,
    COUNT(${alias}.id) FILTER (WHERE ${alias}."trackingPhase"::text IN (${engaged}) AND ${alias}."product"::text NOT IN (${noCv}) AND BTRIM(COALESCE(${alias}."cvLink", '')) <> '') AS fil_cv,
    COUNT(${alias}.id)                                                        AS ep_count
  `;
}

type RawRow = Record<string, any>;

function toRow(r: RawRow): CompletionRow {
  const field = (name: string) => ({
    filled: Number(r[`fil_${name}`] ?? 0),
    expected: Number(r[`exp_${name}`] ?? 0),
  });

  const byField = {
    contacted: field('contacted'),
    trackingPhase: field('phase'),
    notes: field('notes'),
    duration: field('duration'),
    availability: field('availability'),
    cvLink: field('cv'),
  };

  const expected = Object.values(byField).reduce((s, f) => s + f.expected, 0);
  const filled = Object.values(byField).reduce((s, f) => s + f.filled, 0);

  return {
    userId: r.userId,
    fullName: r.fullName,
    avatarUrl: r.avatarUrl ?? null,
    role: r.role,
    department: r.department ?? null,
    teamLeaderId: r.teamLeaderId ?? null,
    teamLeaderName: r.teamLeaderName ?? null,
    epCount: Number(r.ep_count ?? 0),
    expected,
    filled,
    rate: expected === 0 ? 0 : Math.round((filled / expected) * 1000) / 10,
    byField,
  };
}

export class AdminRepository implements IAdminRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  /*
    The join condition carries the window and the grace period rather than a
    WHERE clause, so a member with nothing to show still appears with a row
    of zeroes instead of vanishing from the table.
  */
  private epJoin(window: CompletionWindow): string {
    const from = window.from ? `AND e."assignedAt" >= '${window.from.toISOString()}'` : '';
    const to = window.to ? `AND e."assignedAt" <= '${window.to.toISOString()}'` : '';
    return `
      LEFT JOIN "Ep" e
        ON e."ownerId" = u.id
       AND e."assignedAt" IS NOT NULL
       AND e."assignedAt" <= NOW() - INTERVAL '${GRACE_HOURS} hours'
       ${from}
       ${to}
    `;
  }

  async getCompletionByUser(window: CompletionWindow): Promise<CompletionRow[]> {
    const rows = (await this.db.$queryRawUnsafe(`
      SELECT
        u.id AS "userId",
        u."fullName" AS "fullName",
        u."avatarUrl" AS "avatarUrl",
        u.role::text AS role,
        d.name AS department,
        u."teamLeaderId" AS "teamLeaderId",
        tl."fullName" AS "teamLeaderName",
        ${completionSelect()}
      FROM "User" u
      LEFT JOIN "Department" d ON d.id = u."departmentId"
      LEFT JOIN "User" tl ON tl.id = u."teamLeaderId"
      ${this.epJoin(window)}
      WHERE u."isDisabled" = false
        AND u.role IN ('MEMBER', 'TEAM_LEADER')
      GROUP BY u.id, u."fullName", u."avatarUrl", u.role, d.name, u."teamLeaderId", tl."fullName"
      ORDER BY u."fullName" ASC
    `)) as RawRow[];

    return rows.map(toRow);
  }

  /*
    The rollups are summed from the same per-user figures rather than
    recomputed, so a department can never disagree with the people inside it.
    They are weighted by field count, not by averaging the percentages — a
    member holding two EPs should not swing a department as hard as one
    holding eighty.
  */
  async getCompletionRollups(window: CompletionWindow) {
    const rows = await this.getCompletionByUser(window);

    const roll = (label: string, group: CompletionRow[]): CompletionRollup => {
      const expected = group.reduce((s, r) => s + r.expected, 0);
      const filled = group.reduce((s, r) => s + r.filled, 0);
      return {
        label,
        people: group.length,
        epCount: group.reduce((s, r) => s + r.epCount, 0),
        expected,
        filled,
        rate: expected === 0 ? 0 : Math.round((filled / expected) * 1000) / 10,
      };
    };

    const groupBy = (key: (r: CompletionRow) => string | null) => {
      const map = new Map<string, CompletionRow[]>();
      for (const r of rows) {
        const k = key(r);
        if (!k) continue;
        map.set(k, [...(map.get(k) ?? []), r]);
      }
      return [...map.entries()]
        .map(([label, group]) => roll(label, group))
        .sort((a, b) => b.rate - a.rate);
    };

    return {
      lc: roll('Whole LC', rows),
      departments: groupBy((r) => r.department),
      // A team is its leader's name; members with no leader are not a team.
      teams: groupBy((r) => r.teamLeaderName),
    };
  }

  /*
    EXPA volume over a chosen range.

    Bucketed by the hour for a day and by the day beyond that: a month read
    hour by hour is 720 points on an axis two inches tall, which is a texture
    rather than a trend. The bucket is returned so the chart can label its
    axis for what it actually shows.

    The hourly figures beside it stay hourly whatever the range — the limit
    is per hour, so the bar has to be too, and only the line behind it
    stretches.
  */
  async getExpaUsage(range: ExpaRange = 'day'): Promise<ExpaUsage> {
    /*
      250 an hour. The default used to be 1000, which was a guess; this is
      the figure the LC is working to, so the bar means something now.
      EXPA_HOURLY_LIMIT still overrides it without a deploy.
    */
    const hourlyLimit = Number(process.env['EXPA_HOURLY_LIMIT'] ?? 250);

    /*
      'all' has no lower bound; the rest are fixed intervals.

      Looked up rather than interpolated from the argument. These strings
      reach the query as text, so a value that is not one of the four would
      otherwise put the word "undefined" inside an INTERVAL literal — a
      broken query at best, and the shape of an injection at worst. Anything
      unrecognised falls back to a day.
    */
    const SINCE: Record<string, string | null> = {
      day: '24 hours',
      week: '7 days',
      month: '30 days',
      all: null,
    };
    const key = range in SINCE ? range : 'day';
    const bucket: 'hour' | 'day' = key === 'day' ? 'hour' : 'day';
    const interval = SINCE[key];
    const where = interval === null ? '' : `WHERE "at" >= NOW() - INTERVAL '${interval}'`;

    const [series, totals, byOperation, peak] = await Promise.all([
      this.db.$queryRawUnsafe(`
        SELECT DATE_TRUNC('${bucket}', "at")::text AS at,
               COUNT(*)::int AS requests,
               COUNT(*) FILTER (WHERE NOT ok)::int AS failed,
               COALESCE(ROUND(AVG(ms))::int, 0) AS "avgMs"
        FROM "ExpaRequestLog"
        ${where}
        GROUP BY 1 ORDER BY 1 ASC
      `) as Promise<ExpaUsagePoint[]>,
      this.db.$queryRawUnsafe(`
        SELECT
          COUNT(*) FILTER (WHERE "at" >= NOW() - INTERVAL '1 hour')::int AS "lastHour",
          COUNT(*) FILTER (WHERE "at" >= NOW() - INTERVAL '1 hour' AND NOT ok)::int AS "lastHourFailed",
          COUNT(*)::int AS total
        FROM "ExpaRequestLog"
        ${where}
      `) as Promise<{ lastHour: number; lastHourFailed: number; total: number }[]>,
      this.db.$queryRawUnsafe(`
        SELECT operation, COUNT(*)::int AS requests
        FROM "ExpaRequestLog"
        ${where}
        GROUP BY 1 ORDER BY 2 DESC
      `) as Promise<{ operation: string; requests: number }[]>,
      /*
        The busiest hour, always measured in hours even when the line is
        drawn in days — it is the figure the limit is compared against, and
        a daily total would make the quota look breached every day.
      */
      this.db.$queryRawUnsafe(`
        SELECT COALESCE(MAX(n), 0)::int AS peak FROM (
          SELECT COUNT(*)::int AS n
          FROM "ExpaRequestLog"
          ${where}
          GROUP BY DATE_TRUNC('hour', "at")
        ) h
      `) as Promise<{ peak: number }[]>,
    ]);

    return {
      lastHour: totals[0]?.lastHour ?? 0,
      lastHourFailed: totals[0]?.lastHourFailed ?? 0,
      total: totals[0]?.total ?? 0,
      hourlyLimit,
      peakHour: peak[0]?.peak ?? 0,
      bucket,
      series,
      byOperation,
    };
  }
}
