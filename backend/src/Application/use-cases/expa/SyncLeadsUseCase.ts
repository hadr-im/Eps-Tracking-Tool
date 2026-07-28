import { IExpaRepository } from '../../../Domain/abstracts/IExpaRepository';
import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { Product, EXPA_PROGRAMME_CODE } from '../../../Domain/enums/Product';
import { ExpaLeadMapper } from '../../mappers/ExpaLeadMapper';

interface DepartmentSyncResult {
  product: Product;
  fetched: number;
  newLeads: number;
}

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

  async execute(): Promise<DepartmentSyncResult[]> {
    const products = [Product.GV, Product.GTA, Product.GTE];
    const results: DepartmentSyncResult[] = [];

    for (const product of products) {
      try {
        const result = await this.syncDepartment(product);
        results.push(result);
      } catch (err) {
        console.error(`[SyncLeadsUseCase] Failed for ${product}:`, err);
        results.push({ product, fetched: 0, newLeads: 0 });
      }
    }

    return results;
  }

  private async syncDepartment(product: Product): Promise<DepartmentSyncResult> {
    const code = EXPA_PROGRAMME_CODE[product];
    console.log(`[SyncLeadsUseCase] Syncing leads for ${product}...`);

    const rawLeads = await this.expaRepo.fetchLeads(code);
    const eps = ExpaLeadMapper.toEpMany(rawLeads);

    // saveMany returns the count of rows actually inserted (existing IDs are no-ops at the DB level)
    const { count: newLeads } = await this.epRepo.saveMany(eps);

    console.log(
      `[SyncLeadsUseCase] ${product}: fetched ${rawLeads.length}, new inserts ${newLeads}`,
    );

    return { product, fetched: rawLeads.length, newLeads };
  }
}
