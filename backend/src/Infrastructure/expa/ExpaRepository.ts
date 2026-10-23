import { GraphQLClient } from 'graphql-request';
import { IExpaRepository } from '../../Domain/abstracts/IExpaRepository';
import { ExpaLead } from '../../Domain/types/ExpaLead';
import { ExpaApprovedDetail } from '../../Domain/types/ExpaApprovedDetail';
import { EpStatusResult } from '../../Domain/types/EpStatusResult';


// GraphQL Queries

const FETCH_LEADS_QUERY = `
  query FetchLeads($page: Int!, $perPage: Int!, $programmeCode: [Int]!) {
    people(
      filters: {
        registered: { from: "2026-08-01", to: "2027-01-31" }
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
        person { id full_name phone }
        host_lc { parent { name } }
        host_lc_name
        opportunity {
          id
          title
          project_fee
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
  person: { id: number | string; full_name: string; phone: string | null };
  host_lc: { parent: { name: string } | null } | null;
  host_lc_name: string | null;
  opportunity: {
    id: number | string;
    title: string;
    // EXPA returns project_fee as an object not a plain number
    project_fee: { fee: number; currency: string } | number | null;
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

  async fetchLeads(programmeCode: number): Promise<ExpaLead[]> {
    const allLeads: ExpaLead[] = [];
    let page = 1;
    let totalPages = 1;

    console.log(`[ExpaRepository] Fetching leads for programme ${programmeCode}...`);

    while (page <= totalPages) {
      const data = await this.withRetry<PeopleResponse>(() =>
        this.client.request(FETCH_LEADS_QUERY, {
          page,
          perPage: this.perPage,
          programmeCode: [programmeCode], 
        }),
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
      const data = await this.withRetry<ApplicationsResponse>(() =>
        this.client.request(FETCH_COMMITTEE_APPLICATIONS_QUERY, {
          page,
          perPage: this.appsPerPage,
          committeeId: this.committeeId,
        }),
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
  ): Promise<T> {
    try {
      return await fn();
    } catch (firstError) {
      if (isFatal?.(firstError)) throw firstError;
      console.warn('[ExpaRepository] Request failed, retrying in 2 s...', firstError);
      await new Promise((res) => setTimeout(res, 2_000));
      try {
        return await fn();
      } catch (secondError) {
        console.error('[ExpaRepository] Retry also failed:', secondError);
        throw secondError;
      }
    }
  }

  async fetchPersonById(expaId: string): Promise<ExpaLead | null> {
    const numeric = Number(expaId);
    if (!Number.isInteger(numeric) || numeric <= 0) return null;

    try {
      const data = await this.withRetry<PersonResponse>(
        () => this.client.request(FETCH_PERSON_QUERY, { id: String(numeric) }),
        isRecordNotFound,
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
      university: person.lc_alignment?.keywords ?? null,
      fieldOfStudy: person.person_profile?.backgrounds?.[0]?.name ?? null,
      yearOfStudy: null, // not sure if EXPA exposes this field via GraphQL
      creationDate: person.created_at,
      statusOnExpa: person.status ?? 'open',
      selectedProgrammes: person.person_profile?.selected_programmes ?? [],
    };
  }

  private mapToApprovedDetail(app: RawApplication): ExpaApprovedDetail {
    const isCompleted = app.current_status === 'completed';
    const isFinished = app.current_status === 'finished';

    return {
      appId: String(app.id),
      personExpaId: String(app.person.id),
      fullName: app.person.full_name,
      phone: app.person.phone ?? null,
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
    };
  }
}
