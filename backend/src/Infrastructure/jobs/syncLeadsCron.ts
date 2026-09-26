import cron from 'node-cron';
import { ExpaFactory } from '../factories/ExpaFactory';

/*
  Scheduled EXPA synchronisation jobs

  Schedules:
    - Leads sync   : every 5 minutes  (adds new leads to the DB)
    - Status sync  : every hour       (detects EXPA status / approval changes)

  Each department is handled in isolation inside the use-cases, so a
  failure in one programme (e.g. GV) never blocks the others (GTA, GTE)

  Call 'startCronJobs()' once at application startup (see server.ts)
*/

const factory = new ExpaFactory();
const syncLeadsUseCase  = factory.makeSyncLeadsUseCase();
const syncStatusUseCase = factory.makeSyncStatusUseCase();

// Job handlers

async function runLeadsSync(): Promise<void> {
  console.log('[Cron] Starting leads sync...');
  try {
    const results = await syncLeadsUseCase.execute();
    for (const r of results) {
      console.log(`[Cron] LeadsSync | ${r.product}: fetched ${r.fetched}, new ${r.newLeads}`);
    }
    console.log('[Cron] Leads sync complete.');
  } catch (err) {
    console.error('[Cron] Leads sync failed unexpectedly:', err);
  }
}

async function runStatusSync(): Promise<void> {
  console.log('[Cron] Starting status sync...');
  try {
    const results = await syncStatusUseCase.execute();
    for (const r of results) {
      console.log(
        `[Cron] StatusSync | ${r.product}: checked ${r.checked}, updated ${r.updated}, new approvals ${r.approvedDetailCreated}`,
      );
    }
    console.log('[Cron] Status sync complete.');
  } catch (err) {
    console.error('[Cron] Status sync failed unexpectedly:', err);
  }
}

// Scheduler

export function startCronJobs(): void {
  // Leads sync: every 5 minutes
  cron.schedule('*/5 * * * *', runLeadsSync, {
    name: 'leads-sync',
  });

  // Status/approvals sync: every hour (at :00)
  cron.schedule('0 * * * *', runStatusSync, {
    name: 'status-sync',
  });

  console.log('[Cron] Jobs scheduled:');
  console.log('  leads-sync   (every 5 minutes)');
  console.log('  status-sync  (every hour)');
}
