import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../Infrastructure/Database/PrismaService';

/*
  Read-only extracts for spreadsheets.

  A Google Sheet cannot hold a session, so these do not use the normal JWT.
  They take REPORT_SECRET, as `Authorization: Bearer <secret>` or
  `?secret=<secret>` for callers that cannot set a header — Apps Script can,
  and should.

  Separate from CRON_SECRET on purpose. That key triggers syncs that write to
  the database; this one only reads a handful of aggregate rows, and the two
  live in different places (one in GitHub Actions, one in a spreadsheet owned
  by whoever is keeping the tracker). Sharing a key would mean the sheet's
  owner could run the syncs, and rotating one would break the other.

  Without REPORT_SECRET set the routes refuse to run rather than defaulting
  open: this returns members' names, and an unauthenticated endpoint that
  lists the whole LC is not something to arrive at by forgetting a variable.
*/

const router = Router();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authoriseReport(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env['REPORT_SECRET'];
  if (!expected) {
    res.status(503).json({ error: 'REPORT_SECRET is not configured' });
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

interface ApprovalRow {
  fullName: string;
  department: string;
  ep: string;
  approvedOn: string | null;
}

/*
  GET /api/reports/member-approvals

  One row per approval: who holds the EP, which department, the EP's name and
  the date EXPA granted the approval. A row per approval rather than a count
  per member, so the sheet can be filtered or pivoted by month; the per-member
  tally is a COUNTIF away, and a count cannot be unpicked back into dates.

  What counts as an approval is what the dashboards count — the status having
  reached APPROVED or beyond — so the two cannot drift apart.

  Approvals with no owner are listed as "Unassigned" rather than dropped. Most
  of them are: at the time of writing 206 EPs are approved and only 57 belong
  to an active member, so filtering the rest out would quietly show a third of
  the LC's approvals and look like the whole. The department is the EP's own,
  which is also what lets those rows say something useful.

  ?from=YYYY-MM-DD&to=YYYY-MM-DD narrows it to approvals granted in that
  window. Omit both for all of them.

  ?format=csv returns text/csv. The default is JSON.
*/
router.get('/member-approvals', authoriseReport, async (req: Request, res: Response) => {
  try {
    const day = (value: unknown, endOfDay: boolean): Date | null => {
      if (typeof value !== 'string') return null;
      const [y, m, d] = value.split('-').map(Number);
      if (!y || !m || !d) return null;
      return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
    };
    const from = day(req.query['from'], false);
    const to = day(req.query['to'], true);

    const rows = (await prisma.$queryRaw`
      SELECT
        COALESCE(u."fullName", 'Unassigned') AS "fullName",
        d.name AS department,
        e."fullName" AS ep,
        /*
          A plain calendar date, formatted here rather than left as a
          timestamp: a spreadsheet reads YYYY-MM-DD as a date and will sort
          and filter on it, where an ISO string with a timezone lands as text.
        */
        TO_CHAR(ad."approvalDate", 'YYYY-MM-DD') AS "approvedOn"
      FROM "Ep" e
      JOIN "Department" d ON d.id = e."departmentId"
      LEFT JOIN "User" u ON u.id = e."ownerId" AND u."isDisabled" = false
      LEFT JOIN "ApprovedDetail" ad ON ad."epId" = e.id
      WHERE e."statusOnExpa" IN ('APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED')
        AND (${from}::timestamp IS NULL OR ad."approvalDate" >= ${from}::timestamp)
        AND (${to}::timestamp IS NULL OR ad."approvalDate" <= ${to}::timestamp)
      -- Most recent first; the one approval with no date on it sorts last
      -- rather than to the top, where it would look like the latest news.
      ORDER BY ad."approvalDate" DESC NULLS LAST, e."fullName" ASC
    `) as ApprovalRow[];

    if (req.query['format'] === 'csv') {
      const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [
        'Member,Department,EP,Approved on',
        ...rows.map((r) => [r.fullName, r.department, r.ep, r.approvedOn].map(cell).join(',')),
      ].join('\r\n');
      res.type('text/csv').send(csv);
      return;
    }

    res.json({ generatedAt: new Date().toISOString(), rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
