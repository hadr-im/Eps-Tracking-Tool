import { IExpaRepository } from '../../../Domain/abstracts/IExpaRepository';
import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { Product, EXPA_PROGRAMME_CODE } from '../../../Domain/enums/Product';
import { ExpaLeadMapper } from '../../mappers/ExpaLeadMapper';

interface DepartmentSyncResult {
  product: Product;
  fetched: number;
  newLeads: number;
  /** The registration date the EXPA query started from, or null for a full sweep. */
  since: string | null;
}

/*
  How far back the watermark reaches before the newest record we hold.

  The watermark alone would be wrong. EXPA's registration date does not
  change, but what it is attached to does: someone can add a second
  programme weeks after registering, and they then appear in that
  product's list with an old date that a strict watermark would skip
  forever. A week of overlap catches that, and the occasional correction
  made on EXPA by hand.

  It costs almost nothing. Measured against live data: a 3-day overlap is
  6 requests per run across all three products, 7 days is 8, and no
  watermark at all is 50.
*/
const OVERLAP_DAYS = Number(process.env['LEADS_SYNC_OVERLAP_DAYS'] ?? 7);

// Daily sync : same fetch + upsert logic as SeedLeadsUseCase
// Performance note: saveMany uses skipDuplicates (INSERT ... ON CONFLICT DO NOTHING)
// which is a single DB round-trip regardless of how many already exist
// As EP count grows, only genuinely new rows trigger writes 
// existing rows are skipped at the DB level with no extra overhead per row
export class SyncLeadsUseCase {
  constructor(
    private readonly expaRepo: IExpaRepository,
    private readonly epRepo: IEpRepository,
  ) {}

  // `only` scopes the run to a single department. Serverless deployments have a
  // hard request timeout, so the scheduler calls this once per product rather
  // than paginating all three inside one invocation.
  async execute(only?: Product, full = false): Promise<DepartmentSyncResult[]> {
    const products = only ? [only] : [Product.GV, Product.GTA, Product.GTE];
    const results: DepartmentSyncResult[] = [];

    for (const product of products) {
      try {
        const result = await this.syncDepartment(product, full);
        results.push(result);
      } catch (err) {
        console.error(`[SyncLeadsUseCase] Failed for ${product}:`, err);
        results.push({ product, fetched: 0, newLeads: 0, since: null });
      }
    }

    return results;
  }

  private async syncDepartment(product: Product, full: boolean): Promise<DepartmentSyncResult> {
    const code = EXPA_PROGRAMME_CODE[product];
    const since = full ? null : await this.watermark(product);

    console.log(
      `[SyncLeadsUseCase] Syncing ${product} ${since ? `from ${since}` : '(full sweep)'}...`,
    );

    const rawLeads = await this.expaRepo.fetchLeads(code, since ?? undefined);
    const eps = ExpaLeadMapper.toEpMany(rawLeads);

    // saveMany returns the count of rows actually inserted (existing IDs are no-ops at the DB level)
    const { count: newLeads } = await this.epRepo.saveMany(eps);

    console.log(
      `[SyncLeadsUseCase] ${product}: fetched ${rawLeads.length}, new inserts ${newLeads}`,
    );

    return { product, fetched: rawLeads.length, newLeads, since };
  }

  /*
    The newest registration we hold for this product, less the overlap.

    Null when we hold nothing — a first run has no watermark and must sweep
    the season. Formatted as a plain date because that is what the EXPA
    filter takes.
  */
  private async watermark(product: Product): Promise<string | null> {
    const newest = await this.epRepo.newestExpaRegistration(product);
    if (!newest) return null;

    const from = new Date(newest);
    from.setDate(from.getDate() - OVERLAP_DAYS);
    return from.toISOString().slice(0, 10);
  }
}
