import { GraphQLClient } from 'graphql-request';
import { IExpaRepository } from '../../Domain/abstracts/IExpaRepository';
import { ExpaLead } from '../../Domain/types/ExpaLead';
import { ExpaApprovedDetail } from '../../Domain/types/ExpaApprovedDetail';
import { EpStatusResult } from '../../Domain/types/EpStatusResult';
import { ExpaApproval } from '../../Domain/types/ExpaApproval';
import { prisma } from '../Database/PrismaService';
import { PROGRAMME_FROM_EXPA_CODE } from '../../Domain/enums/Product';


// GraphQL Queries

/*
  The season this committee is recruiting for. The lower bound is only used
  when there is no watermark to work from — a first run, or a deliberate
  full resync.
*/
const SEASON_START = process.env['EXPA_SEASON_START'] ?? '2026-09-01';
const SEASON_END = process.env['EXPA_SEASON_END'] ?? '2027-01-31';

const FETCH_LEADS_QUERY = `
  query FetchLeads($page: Int!, $perPage: Int!, $programmeCode: [Int]!, $from: DateTime!, $to: DateTime!) {
    people(
      filters: {
        registered: { from: $from, to: $to }
        selected_programmes: $programmeCode
      }
      per_page: $perPage
      page: $page
    ) {
      paging {
        total_pages
        total_items
      }
      data {
        id
        full_name
        email
        created_at
        status
        contact_detail { phone }
        person_profile {
          backgrounds { name }
          selected_programmes
        }
        lc_alignment { keywords }
      }
    }
  }
`;

/*
 Fetches the committee's applications in bulk, one page at a time.

 ApplicationFilter only accepts a single person_id (Int, not a list), so asking
 per person meant one request per EP — ~1500 requests, which overran the
 serverless request timeout. Filtering by person_committee returns the same
 data for everyone at once.

 The status list is what matters: unfiltered this committee has ~22k
 applications, but only ~800 are approved or beyond, and the sync ignores
 everything below that threshold. Narrowing here turns 91 pages into 4.
 Statuses are inlined rather than passed as a variable to avoid depending on
 the exact nullability of the schema's String list type.
*/
/*
 Single person by id, for the manual leads page. Mirrors the field set of
 FETCH_LEADS_QUERY so the same mapper can be reused.
*/
const FETCH_PERSON_QUERY = `
  query FetchPerson($id: ID!) {
    person(id: $id) {
      id
      full_name
      email
      created_at
      status
      contact_detail { phone }
      person_profile {
        backgrounds { name }
        selected_programmes
      }
      lc_alignment { keywords }
    }
  }
`;

const APPROVED_STATUSES = ['approved', 'realized', 'completed', 'finished'];

// Position along the funnel. Only the approved-and-beyond entries can occur in
// the filtered results; the earlier ones are kept so the ranking still reads
// correctly against EpStatus and survives a widening of APPROVED_STATUSES.
const APPLICATION_STATUS_RANK: Record<string, number> = {
  lead:       0,
  contacted:  1,
  interested: 2,
  approved:   3,
  realized:   4,
  completed:  5,
  finished:   6,
};

const FETCH_COMMITTEE_APPLICATIONS_QUERY = `
  query FetchCommitteeApplications($page: Int!, $perPage: Int!, $committeeId: Int!) {
    allOpportunityApplication(
      filters: {
        person_committee: $committeeId
        statuses: [${APPROVED_STATUSES.map((s) => `"${s}"`).join(', ')}]
      }
      per_page: $perPage
      page: $page
    ) {
      paging {
        total_pages
        total_items
      }
      data {
        id
        current_status
        date_approved
        date_realized
        experience_end_date
        person { id full_name email contact_detail { phone } }
        host_lc { parent { name } }
        host_lc_name
        opportunity {
          id
          title
          project_fee
          # Decides which department owns the approval.
          programme { id }
        }
      }
    }
  }
`;


// Response shapes

interface PeopleResponse {
  people: {
    paging: { total_pages: number; total_items: number };
    data: RawPerson[];
  };
}

interface RawPerson {
  id: number | string;
  full_name: string;
  email: string | null;
  created_at: string;
  status: string | null;
  contact_detail: { phone: string | null } | null;
  person_profile: {
    backgrounds: { name: string }[];
    selected_programmes: number[];
  } | null;
  lc_alignment: { keywords: string | null } | null;
}

interface PersonResponse {
  person: RawPerson | null;
}

// graphql-request wraps the GraphQL error list on the thrown error's response.
function isRecordNotFound(err: unknown): boolean {
  const errors = (err as { response?: { errors?: { extensions?: { code?: string } }[] } })
    ?.response?.errors;
  return Array.isArray(errors) && errors.some((e) => e?.extensions?.code === 'record_not_found');
}

interface ApplicationsResponse {
  allOpportunityApplication: {
    paging: { total_pages: number; total_items: number };
    data: RawApplication[];
  };
}

interface RawApplication {
  id: number | string;
  current_status: string;
  date_approved: string | null;
  date_realized: string | null;
  experience_end_date: string | null;
  person: {
    id: number | string;
    full_name: string;
    email: string | null;
    contact_detail: { phone: string | null } | null;
  };
  host_lc: { parent: { name: string } | null } | null;
  host_lc_name: string | null;
  opportunity: {
    id: number | string;
    title: string;
    // EXPA returns project_fee as an object not a plain number
    project_fee: { fee: number; currency: string } | number | null;
    programme: { id: number | string } | null;
  } | null;
}


// Repository implementation

export class ExpaRepository implements IExpaRepository {
  private readonly client: GraphQLClient;
  private readonly committeeId: number;
  private readonly perPage = 50;
  // Applications are far more numerous than people, so they page in larger
  // chunks: ~800 approved rows land in 4 requests rather than 17.
  private readonly appsPerPage = 250;

  constructor() {
    const apiUrl = process.env.EXPA_API_URL;
    const token = process.env.EXPA_ACCESS_TOKEN;
    const lcId = process.env.EXPA_LC_COMMITTEE_ID;

    if (!apiUrl || !token || !lcId) {
      throw new Error(
        'Missing required EXPA env vars: EXPA_API_URL, EXPA_ACCESS_TOKEN, EXPA_LC_COMMITTEE_ID',
      );
    }

    this.client = new GraphQLClient(apiUrl, {
      headers: { Authorization: token },
    });
    this.committeeId = parseInt(lcId, 10);
  }

  // fetchLeads

  /*
    `registeredFrom` is the watermark. EXPA pages at fifty, so sweeping the
    whole season costs fifty requests per run however little has changed —
    and nothing older than the last sync can have changed. Narrowing the
    registration window to the recent past takes a run from about fifty
    requests to about eight.

    Omit it and the full season is swept, which is what a first run and a
    manual resync want.
  */
  async fetchLeads(programmeCode: number, registeredFrom?: string): Promise<ExpaLead[]> {
    const allLeads: ExpaLead[] = [];
    let page = 1;
    let totalPages = 1;

    console.log(`[ExpaRepository] Fetching leads for programme ${programmeCode}...`);

    while (page <= totalPages) {
      const data = await this.withRetry<PeopleResponse>(
        () =>
          this.client.request(FETCH_LEADS_QUERY, {
            page,
            perPage: this.perPage,
            programmeCode: [programmeCode],
            from: registeredFrom ?? SEASON_START,
            to: SEASON_END,
          }),
        undefined,
        'fetchLeads',
      );

      const { paging, data: people } = data.people;
      totalPages = paging.total_pages;

      for (const person of people) {
        allLeads.push(this.mapToExpaLead(person));
      }

      console.log(
        `[ExpaRepository] Page ${page}/${totalPages} — ${people.length} leads fetched`,
      );
      page++;
    }

    console.log(
      `[ExpaRepository] Done. Total leads for programme ${programmeCode}: ${allLeads.length}`,
    );
    return allLeads;
  }

  async fetchEpStatus(epIds: string[]): Promise<EpStatusResult[]> {
    if (epIds.length === 0) return [];

    const wanted = new Set(epIds);

    // A person can hold several approved applications; the sync acts on the
    // furthest one along the funnel, so keep the highest-ranked per person.
    const bestByPerson = new Map<string, RawApplication>();

    let page = 1;
    let totalPages = 1;
    let scanned = 0;

    console.log(`[ExpaRepository] Checking application status for ${epIds.length} EPs...`);

    while (page <= totalPages) {
      const data = await this.withRetry<ApplicationsResponse>(
        () =>
          this.client.request(FETCH_COMMITTEE_APPLICATIONS_QUERY, {
            page,
            perPage: this.appsPerPage,
            committeeId: this.committeeId,
          }),
        undefined,
        'fetchEpStatus',
      );

      const { paging, data: applications } = data.allOpportunityApplication;
      totalPages = paging.total_pages;
      scanned += applications.length;

      for (const app of applications) {
        const personId = String(app.person?.id ?? '');
        if (!personId || !wanted.has(personId)) continue;

        const incoming = APPLICATION_STATUS_RANK[app.current_status.toLowerCase()] ?? 0;
        const existing = bestByPerson.get(personId);
        const existingRank = existing
          ? APPLICATION_STATUS_RANK[existing.current_status.toLowerCase()] ?? 0
          : -1;

        if (incoming > existingRank) bestByPerson.set(personId, app);
      }

      console.log(
        `[ExpaRepository] Page ${page}/${totalPages} — ${applications.length} applications, ${bestByPerson.size} matched so far`,
      );
      page++;
    }

    const results: EpStatusResult[] = [...bestByPerson].map(([epId, app]) => ({
      epId,
      status: app.current_status,
      approvedDetail: this.mapToApprovedDetail(app),
    }));

    console.log(
      `[ExpaRepository] Done. Scanned ${scanned} applications, ${results.length} EPs with approved+ applications found.`,
    );
    return results;
  }

  // Private helpers

  /*
   Executes a GraphQL request and retries once after 2 s on failure.

   `isFatal` marks errors that are a definitive answer rather than a transient
   fault — retrying those only wastes two seconds before failing the same way.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    isFatal?: (err: unknown) => boolean,
    // Named so the admin page can say which query is using the quota. The
    // retry is logged as its own attempt, because EXPA counts it as one.
    operation = 'unknown',
  ): Promise<T> {
    try {
      return await this.timed(operation, fn);
    } catch (firstError) {
      if (isFatal?.(firstError)) throw firstError;
      console.warn('[ExpaRepository] Request failed, retrying in 2 s...', firstError);
      await new Promise((res) => setTimeout(res, 2_000));
      try {
        return await this.timed(operation, fn);
      } catch (secondError) {
        console.error('[ExpaRepository] Retry also failed:', secondError);
        throw secondError;
      }
    }
  }

  /*
    Runs the request and records that it happened.

    EXPA is a shared service with a rate limit, and nothing here recorded how
    hard this tool leans on it — so the first sign of trouble would have been
    a sync failing mid-run. Every call is now a row, which is what the admin
    page draws against the ceiling.

    The write is fire-and-forget and swallows its own errors in both
    directions: a logging failure must never turn into a sync failure, and an
    unawaited rejection must not crash the process. The duration is measured
    around the request whether it succeeds or throws, since a slow failure is
    the more interesting one.
  */
  private async timed<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const started = Date.now();
    try {
      const out = await fn();
      this.record(operation, true, Date.now() - started);
      return out;
    } catch (err) {
      this.record(operation, false, Date.now() - started);
      throw err;
    }
  }

  private record(operation: string, ok: boolean, ms: number): void {
    void prisma.expaRequestLog
      .create({ data: { operation, ok, ms } })
      .catch((err: unknown) => {
        console.warn('[ExpaRepository] Could not log the request:', err);
      });
  }

  async fetchPersonById(expaId: string): Promise<ExpaLead | null> {
    const numeric = Number(expaId);
    if (!Number.isInteger(numeric) || numeric <= 0) return null;

    try {
      const data = await this.withRetry<PersonResponse>(
        () => this.client.request(FETCH_PERSON_QUERY, { id: String(numeric) }),
        isRecordNotFound,
        'fetchPersonById',
      );
      return data.person ? this.mapToExpaLead(data.person) : null;
    } catch (err) {
      // EXPA answers an unknown id with a GraphQL error rather than a null
      // person, which graphql-request throws. That is a definitive answer, not
      // a transient failure, so it must not be retried or raised as a 500.
      if (isRecordNotFound(err)) return null;
      throw err;
    }
  }

  private mapToExpaLead(person: RawPerson): ExpaLead {
    return {
      epId: String(person.id),
      fullName: person.full_name,
      email: person.email ?? null,
      phone: person.contact_detail?.phone ?? null,
      // EXPA pads this with leading whitespace, which then shows up in the UI
      // and makes a sheet value look like a change when it is only trimmed.
      university: person.lc_alignment?.keywords?.trim() || null,
      fieldOfStudy: person.person_profile?.backgrounds?.[0]?.name ?? null,
      yearOfStudy: null, // not sure if EXPA exposes this field via GraphQL
      creationDate: person.created_at,
      statusOnExpa: person.status ?? 'open',
      selectedProgrammes: person.person_profile?.selected_programmes ?? [],
    };
  }

  /*
    Every approved-or-beyond application in our committee, with the person and
    the owning programme attached.

    Unlike fetchEpStatus this asks nothing about what is already in the
    database — it reports what EXPA holds, and the caller reconciles. That is
    what lets an approved EP who was never a lead here still appear under their
    department.
  */
  async fetchCommitteeApprovals(): Promise<ExpaApproval[]> {
    const approvals: ExpaApproval[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const data = await this.withRetry<ApplicationsResponse>(
        () =>
          this.client.request(FETCH_COMMITTEE_APPLICATIONS_QUERY, {
            page,
            perPage: this.appsPerPage,
            committeeId: this.committeeId,
          }),
        undefined,
        'fetchCommitteeApprovals',
      );

      const { paging, data: applications } = data.allOpportunityApplication;
      totalPages = paging.total_pages;

      for (const app of applications) {
        const programmeId = app.opportunity?.programme?.id;
        approvals.push({
          expaId: String(app.person.id),
          fullName: app.person.full_name,
          email: app.person.email ?? null,
          phone: app.person.contact_detail?.phone ?? null,
          status: app.current_status,
          product: programmeId ? PROGRAMME_FROM_EXPA_CODE[Number(programmeId)] ?? null : null,
          detail: this.mapToApprovedDetail(app),
        });
      }

      console.log(
        `[ExpaRepository] Approvals page ${page}/${totalPages} — ${applications.length} applications`,
      );
      page++;
    }

    console.log(`[ExpaRepository] Done. ${approvals.length} committee approvals.`);
    return approvals;
  }

  private mapToApprovedDetail(app: RawApplication): ExpaApprovedDetail {
    const isCompleted = app.current_status === 'completed';
    const isFinished = app.current_status === 'finished';

    return {
      appId: String(app.id),
      personExpaId: String(app.person.id),
      fullName: app.person.full_name,
      phone: app.person.contact_detail?.phone ?? null,
      opportunityId: app.opportunity ? String(app.opportunity.id) : null,
      opportunityTitle: app.opportunity?.title ?? null,
      hostingMC: app.host_lc?.parent?.name ?? null,
      hostingLC: app.host_lc_name ?? null,
      approvalDate: app.date_approved ?? null,
      realizedDate: app.date_realized ?? null,
      completedDate: isCompleted ? (app.experience_end_date ?? null) : null,
      finishedDate: isFinished ? (app.experience_end_date ?? null) : null,
      projectFees: (
        typeof app.opportunity?.project_fee === 'object' && app.opportunity.project_fee !== null
          ? (app.opportunity.project_fee as { fee: number }).fee
          : (app.opportunity?.project_fee as number | null) ?? null
      ),
      // Which programme this approval actually belongs to. Already in the
      // query; it was being discarded here.
      product: app.opportunity?.programme?.id
        ? PROGRAMME_FROM_EXPA_CODE[Number(app.opportunity.programme.id)] ?? null
        : null,
    };
  }
}
