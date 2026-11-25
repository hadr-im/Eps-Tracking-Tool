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

/*
  Off unless ENABLE_IN_PROCESS_CRON is set.

  This scheduler predates the move to an external one, and on a serverless
  host it never fires — there is no process between requests — so it looked
  harmless and was left in place. It is not harmless anywhere a process does
  stay up: a developer running `npm run dev` was silently syncing every five
  minutes against the real EXPA and the production database, which came to
  about 600 requests an hour. Measured against the admin page's own figures
  that was roughly 85% of all the traffic this tool sent to EXPA — far more
  than every scheduled job put together, and invisible because nobody
  associates a local dev server with load on a shared service.

  The work is done by cron-job.org now. This stays only so a persistent
  deployment could opt back in, and it says loudly what it is doing when
  it does.
*/
export function startCronJobs(): void {
  if (process.env['ENABLE_IN_PROCESS_CRON'] !== 'true') {
    console.log(
      '[Cron] In-process scheduler is off. The syncs are driven externally; ' +
        'set ENABLE_IN_PROCESS_CRON=true only on a host that stays running.',
    );
    return;
  }

  console.warn(
    '[Cron] In-process scheduler is ON — this process will call EXPA every ' +
      '5 minutes and write to whichever database DATABASE_URL points at.',
  );

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
