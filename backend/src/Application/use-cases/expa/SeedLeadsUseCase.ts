import { IExpaRepository } from '../../../Domain/abstracts/IExpaRepository';
import { IEpRepository } from '../../../Domain/abstracts/IEpRepository';
import { Product, EXPA_PROGRAMME_CODE, PROGRAMME_DEPARTMENT_ID } from '../../../Domain/enums/Product';
import { ExpaLeadMapper } from '../../mappers/ExpaLeadMapper';

interface DepartmentSeedResult {
  product: Product;
  fetched: number;
  inserted: number;
}

// Initial one time seed that pulls all this summer's leads from EXPA into the DB
// Safe to run multiple times (upsert logic prevents duplicates)
export class SeedLeadsUseCase {
  constructor(
    private readonly expaRepo: IExpaRepository,
    private readonly epRepo: IEpRepository,
  ) {}

  async execute(): Promise<DepartmentSeedResult[]> {
    const products = [Product.GV, Product.GTA, Product.GTE];
    const results: DepartmentSeedResult[] = [];

    for (const product of products) {
      try {
        const result = await this.seedDepartment(product);
        results.push(result);
      } catch (err) {
        // Isolate failures (one department failing won't abort the others)
        console.error(`[SeedLeadsUseCase] Failed for ${product}:`, err);
        results.push({ product, fetched: 0, inserted: 0 });
      }
    }

    return results;
  }

  private async seedDepartment(product: Product): Promise<DepartmentSeedResult> {
    const code = EXPA_PROGRAMME_CODE[product];
    console.log(`[SeedLeadsUseCase] Starting seed for ${product} (EXPA code ${code})...`);

    const rawLeads = await this.expaRepo.fetchLeads(code);
    console.log(`[SeedLeadsUseCase] ${product}: fetched ${rawLeads.length} leads from EXPA`);

    const eps = ExpaLeadMapper.toEpMany(rawLeads);

    // saveMany returns the count of rows actually inserted 
    const { count: inserted } = await this.epRepo.saveMany(eps);

    console.log(`[SeedLeadsUseCase] ${product}: inserted ${inserted} new EP records (${eps.length - inserted} already existed)`);

    return { product, fetched: rawLeads.length, inserted };
  }
}
