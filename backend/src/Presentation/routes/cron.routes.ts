import { Router, Request, Response, NextFunction } from 'express';
import { ExpaFactory } from '../../Infrastructure/factories/ExpaFactory';
import { Product } from '../../Domain/enums/Product';

/*
  HTTP-triggered EXPA sync.

  On a serverless host there is no long-lived process, so node-cron never fires
  (see Infrastructure/jobs/syncLeadsCron.ts, which only runs on a persistent
  server). Instead an external scheduler calls these endpoints.

  Auth: CRON_SECRET, accepted either as `Authorization: Bearer <secret>` (what
  Vercel Cron sends) or `?secret=<secret>` for schedulers that cannot set
  headers. Without the env var set the routes refuse to run at all rather than
  defaulting open.

  Scope one product per call (?product=GV) to stay inside the request timeout.
*/

const router = Router();

const factory = new ExpaFactory();
const syncLeadsUseCase = factory.makeSyncLeadsUseCase();
const syncStatusUseCase = factory.makeSyncStatusUseCase();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authoriseCron(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env['CRON_SECRET'];
  if (!expected) {
    res.status(503).json({ error: 'CRON_SECRET is not configured' });
    return;
  }

  const header = req.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const query = typeof req.query['secret'] === 'string' ? req.query['secret'] : '';
  const supplied = bearer || query;

  if (!supplied || !timingSafeEqual(supplied, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

function parseProduct(req: Request): Product | undefined {
  const raw = req.query['product'];
  if (typeof raw !== 'string') return undefined;
  const upper = raw.toUpperCase();
  return (Object.values(Product) as string[]).includes(upper)
    ? (upper as Product)
    : undefined;
}

router.use(authoriseCron);

router.all('/sync-leads', async (req: Request, res: Response) => {
  try {
    const results = await syncLeadsUseCase.execute(parseProduct(req));
    res.json({ job: 'sync-leads', results });
  } catch (err) {
    console.error('[Cron] sync-leads failed:', err);
    res.status(500).json({ job: 'sync-leads', error: 'Sync failed' });
  }
});

router.all('/sync-status', async (req: Request, res: Response) => {
  try {
    const results = await syncStatusUseCase.execute(parseProduct(req));
    res.json({ job: 'sync-status', results });
  } catch (err) {
    console.error('[Cron] sync-status failed:', err);
    res.status(500).json({ job: 'sync-status', error: 'Sync failed' });
  }
});

export default router;
