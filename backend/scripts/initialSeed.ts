import 'dotenv/config';
import { ExpaRepository } from '../src/Infrastructure/expa/ExpaRepository';
import { EpRepository } from '../src/Infrastructure/repositories/EpRepository';
import { SeedLeadsUseCase } from '../src/Application/use-cases/expa/SeedLeadsUseCase';
import { SyncStatusUseCase } from '../src/Application/use-cases/expa/SyncStatusUseCase';

async function run() {
  console.log('=== Starting Initial EXPA Seed ===\n');

  const expaRepo = new ExpaRepository();
  const epRepo = new EpRepository();

  // 1. Seed raw leads
  console.log('--- Step 1: Seeding Leads ---');
  const seedLeadsUseCase = new SeedLeadsUseCase(expaRepo, epRepo);
  const leadResults = await seedLeadsUseCase.execute();

  let totalFetched = 0;
  let totalInserted = 0;

  console.log('\n=== Lead Seed Summary ===');
  for (const r of leadResults) {
    console.log(
      `  ${r.product}: fetched ${r.fetched}, inserted ${r.inserted}`,
    );
    totalFetched += r.fetched;
    totalInserted += r.inserted;
  }
  console.log(
    `\n  Total Leads: fetched ${totalFetched}, inserted ${totalInserted}\n`,
  );

  // 2. Sync statuses & populate ApprovedDetail records for approved EPs
  console.log('--- Step 2: Syncing Statuses & Approved Details ---');
  const syncStatusUseCase = new SyncStatusUseCase(expaRepo, epRepo);
  const statusResults = await syncStatusUseCase.execute();

  console.log('\n=== Status Sync Summary ===');
  let totalChecked = 0;
  let totalUpdated = 0;
  let totalApprovedCreated = 0;

  for (const r of statusResults) {
    console.log(
      `  ${r.product}: checked ${r.checked}, updated ${r.updated}, approved details ${r.approvedDetailCreated}`,
    );
    totalChecked += r.checked;
    totalUpdated += r.updated;
    totalApprovedCreated += r.approvedDetailCreated;
  }
  console.log(
    `\n  Total Statuses: checked ${totalChecked}, updated ${totalUpdated}, approved details created ${totalApprovedCreated}`,
  );

  console.log('\n=== Done ===');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n Initial seed failed:', err);
  process.exit(1);
});
