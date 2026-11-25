/*
  The admin dashboard's shapes. Mirrors IAdminRepository on the server; see
  there for what "completion" counts and why.
*/

export interface FieldScore {
  filled: number;
  expected: number;
}

export interface CompletionRow {
  userId: string;
  fullName: string;
  role: string;
  department: string | null;
  teamLeaderId: string | null;
  teamLeaderName: string | null;
  epCount: number;
  expected: number;
  filled: number;
  rate: number;
  byField: Record<string, FieldScore>;
}

export interface CompletionRollup {
  label: string;
  epCount: number;
  expected: number;
  filled: number;
  rate: number;
  people: number;
}

export interface Champion {
  userId: string;
  fullName: string;
  role: string;
  department: string | null;
  rate: number;
  epCount: number;
}

export interface ExpaUsagePoint {
  at: string;
  requests: number;
  failed: number;
  avgMs: number;
}

export type ExpaRange = 'day' | 'week' | 'month' | 'all';

export interface ExpaUsage {
  lastHour: number;
  lastHourFailed: number;
  hourlyLimit: number;
  peakHour: number;
  series: ExpaUsagePoint[];
  /** What one point on the line represents. */
  bucket: 'hour' | 'day';
  /** Calls over the whole range, not just the last hour. */
  total: number;
  byOperation: { operation: string; requests: number }[];
}

export interface AdminDashboardDto {
  champions: Champion[];
  rollups: {
    lc: CompletionRollup;
    departments: CompletionRollup[];
    teams: CompletionRollup[];
  };
  top: CompletionRow[];
  bottom: CompletionRow[];
  people: CompletionRow[];
  expa: ExpaUsage;
}

export interface AdminDashboardApiResponse {
  data: AdminDashboardDto;
}

export type AdminPeriod = 'week' | 'month' | 'all';

/*
  The six scored fields, in the order the CRM asks for them, with labels the
  page can print. Kept here rather than derived from the payload so the
  columns keep their order when a field happens to be empty for everyone.
*/
export const SCORED_FIELDS: { key: string; label: string; short: string }[] = [
  { key: 'contacted', label: 'Contacted', short: 'Cont.' },
  { key: 'trackingPhase', label: 'Tracking phase', short: 'Phase' },
  { key: 'notes', label: 'Notes', short: 'Notes' },
  { key: 'duration', label: 'Duration', short: 'Dur.' },
  { key: 'availability', label: 'Availability', short: 'Avail.' },
  { key: 'cvLink', label: 'CV link', short: 'CV' },
];
