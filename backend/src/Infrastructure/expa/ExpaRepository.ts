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
 Fetches a single person's approved applications by their EXPA ID
*/
const FETCH_PERSON_APPLICATION_QUERY = `
  query FetchPersonApplications($personId: Int!) {
    allOpportunityApplication(
      filters: { person_id: $personId }
      per_page: 10
      page: 1
    ) {
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

interface PersonApplicationsResponse {
  allOpportunityApplication: {
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

    const CONCURRENCY = 10;

    const appStatusRank: Record<string, number> = {
      lead:       0,
      contacted:  1,
      interested: 2,
      approved:   3,
      realized:   4,
      completed:  5,
      finished:   6,
    };

    const APPROVED_RANK_THRESHOLD = 3; // approved or beyond

    const results: EpStatusResult[] = [];

    console.log(`[ExpaRepository] Checking application status for ${epIds.length} EPs (batch size ${CONCURRENCY})...`);

    for (let i = 0; i < epIds.length; i += CONCURRENCY) {
      const batch = epIds.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.all(
        batch.map(async (epId): Promise<EpStatusResult | null> => {
          try {
            const data = await this.withRetry<PersonApplicationsResponse>(() =>
              this.client.request(FETCH_PERSON_APPLICATION_QUERY, {
                personId: parseInt(epId, 10),
              }),
            );

            const bestApp = data.allOpportunityApplication.data
              .sort((a, b) =>
                (appStatusRank[b.current_status.toLowerCase()] ?? 0) -
                (appStatusRank[a.current_status.toLowerCase()] ?? 0),
              )[0];

            if (!bestApp || (appStatusRank[bestApp.current_status.toLowerCase()] ?? 0) < APPROVED_RANK_THRESHOLD) {
              return null;
            }

            return {
              epId,
              status: bestApp.current_status,
              approvedDetail: this.mapToApprovedDetail(bestApp),
            };
          } catch {
            return null; 
          }
        }),
      );

      for (const r of batchResults) {
        if (r) results.push(r);
      }

      if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= epIds.length) {
        console.log(
          `[ExpaRepository] Progress: ${Math.min(i + CONCURRENCY, epIds.length)}/${epIds.length} EPs checked, ${results.length} approved+ found`,
        );
      }
    }

    console.log(`[ExpaRepository] Done. ${results.length} EPs with approved+ applications found.`);
    return results;
  }

  // Private helpers

  /*
   Executes a GraphQL request and retries once after 2 s on failure
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (firstError) {
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
