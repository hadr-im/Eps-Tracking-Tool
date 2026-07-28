import cron from 'node-cron';
import { ExpaFactory } from '../factories/ExpaFactory';

/*
  Scheduled EXPA synchronisation jobs

  Schedules:
    - Daily Leads Sync  : every day at midnight (adds new leads to the DB)
    - Status Sync       : every 15 minutes     (detects EXPA status changes)

  Each department is handled in isolation inside the use-cases, so a
  failure in one programme (e.g. GV) never blocks the others (GTA, GTE)

  Call 'startCronJobs()' once at application startup (see server.ts)
*/

// Use a module-level factory so the repositories are shared across both jobs and only instantiated once
const factory = new ExpaFactory();
const syncLeadsUseCase = factory.makeSyncLeadsUseCase();
const syncStatusUseCase = factory.makeSyncStatusUseCase();

// Job handlers 

async function runLeadsSync(): Promise<void> {
  console.log('[Cron] Starting daily leads sync...');
  try {
    const results = await syncLeadsUseCase.execute();
    for (const r of results) {
      console.log(`[Cron] LeadsSync | ${r.product}: fetched ${r.fetched}, new ${r.newLeads}`);
    }
    console.log('[Cron] Daily leads sync complete.');
  } catch (err) {
    console.error('[Cron] Daily leads sync failed unexpectedly:', err);
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
  // Daily leads sync: every day at midnight (server local time)
  cron.schedule('0 0 -', runLeadsSync, {
    name: 'daily-leads-sync',
  });

  // Status sync: every 15 minutes
  cron.schedule('*/15 -', runStatusSync, {
    name: 'status-sync',
  });

  console.log('[Cron] Jobs scheduled:');
  console.log('  Daily-leads-sync (every day at midnight)');
  console.log('  Status-sync      (every 15 minutes)');
}
