/*
  The admin page's numbers.

  ── What "data completion" means ────────────────────────────────────────────

  It scores the CRM work a member does on the EPs assigned to them, and
  nothing else. University, field of study, year and source are deliberately
  excluded: the sign-up sheet fills those automatically, so counting them
  would measure the sync and hand marks to whoever happened to be given leads
  who filled the form properly.

  Six fields are scored, in two tiers:

    always, on every assigned EP    contacted, trackingPhase, notes
    only once the EP is engaged     duration, availability, cvLink

  The second tier is conditional because an EP who never replied cannot have
  a preferred duration — and scoring that as a gap would mean a member is
  punished for closing a dead lead honestly, which is exactly the behaviour
  you do not want to price. "Engaged" is read off the tracking phase: a
  conversation that reached explaining AIESEC or beyond. Waiting for an
  answer, not responding and not interested are scored out of three.

  `interested` is recorded but not scored — it is a judgement call, and a
  blank is a legitimate "do not know yet".

  Finally, EPs assigned within the grace period are left out altogether. A
  member handed fifty leads at four o'clock has not failed to fill them in by
  five, and without this a dispatch would crater the whole department's score
  on the day it happened.
*/

export interface CompletionRow {
  userId: string;
  fullName: string;
  /** Their Google picture, when they signed in with one. */
  avatarUrl: string | null;
  role: string;
  department: string | null;
  teamLeaderId: string | null;
  teamLeaderName: string | null;
  /** EPs counted — assigned, past the grace period. */
  epCount: number;
  /** Fields that ought to be filled across those EPs. */
  expected: number;
  /** Fields actually filled. */
  filled: number;
  /** filled / expected, 0–100. 0 when nothing is expected. */
  rate: number;
  /** Per-field fill rates, so a low score says which habit is missing. */
  byField: Record<string, { filled: number; expected: number }>;
}

export interface CompletionRollup {
  label: string;
  epCount: number;
  expected: number;
  filled: number;
  rate: number;
  /** Members counted in this group. */
  people: number;
}

export interface ExpaUsagePoint {
  /** Start of the bucket, ISO. */
  at: string;
  requests: number;
  failed: number;
  /** Mean round-trip in ms. */
  avgMs: number;
}

/*
  How far back the EXPA chart reaches, and therefore how it is bucketed.

  A day of traffic is read hour by hour; a month of it read that way is 720
  points on an axis two inches tall. So anything past a day buckets by day,
  and the chart says which it is rather than leaving the reader to infer it
  from the labels.
*/
export type ExpaRange = 'day' | 'week' | 'month' | 'all';

export interface ExpaUsage {
  /** Calls in the last rolling 60 minutes. */
  lastHour: number;
  /** Failures within that hour. */
  lastHourFailed: number;
  /** The ceiling the bar is drawn against (EXPA_HOURLY_LIMIT). */
  hourlyLimit: number;
  /** Busiest single hour in the window, for context on the bar. */
  peakHour: number;
  /** Buckets, oldest first. */
  series: ExpaUsagePoint[];
  /** What one point represents, so the axis can be labelled honestly. */
  bucket: 'hour' | 'day';
  /** Total calls over the whole range, not just the last hour. */
  total: number;
  /** Calls per query name in the window. */
  byOperation: { operation: string; requests: number }[];
}

export interface CompletionWindow {
  /** Only EPs assigned on or after this, when set. */
  from?: Date;
  to?: Date;
}

export interface IAdminRepository {
  /** One row per active member and team leader, department-agnostic. */
  getCompletionByUser(window: CompletionWindow): Promise<CompletionRow[]>;
  /** Totals for the whole LC, then per department, then per team. */
  getCompletionRollups(
    window: CompletionWindow,
  ): Promise<{ lc: CompletionRollup; departments: CompletionRollup[]; teams: CompletionRollup[] }>;
  /** EXPA call volume over the chosen range. */
  getExpaUsage(range: ExpaRange): Promise<ExpaUsage>;
}
