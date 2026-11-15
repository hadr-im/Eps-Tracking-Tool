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
  approvals: number;
}

/*
  GET /api/reports/member-approvals

  One row per active member: name, department, and how many of their EPs have
  been approved. Counted the same way the dashboards count an approval — the
  status having reached APPROVED or beyond — so the sheet and the leaderboard
  cannot drift apart.

  ?from=YYYY-MM-DD&to=YYYY-MM-DD narrows it to approvals granted in that
  window, by the approval date EXPA gives the application, matching what the
  dashboards mean by a period. Omit both for all time.

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
    const windowed = !!(from || to);

    const rows = (await prisma.$queryRaw`
      SELECT
        u."fullName" AS "fullName",
        d.name AS department,
        COUNT(e.id) FILTER (
          WHERE CASE WHEN ${windowed}::boolean
                THEN COALESCE(ad."approvalDate" BETWEEN COALESCE(${from}::timestamp, '-infinity')
                                                    AND COALESCE(${to}::timestamp, 'infinity'), false)
                ELSE e."statusOnExpa" IN ('APPROVED', 'REALIZED', 'COMPLETED', 'FINISHED') END
        )::int AS approvals
      FROM "User" u
      JOIN "Department" d ON d.id = u."departmentId"
      LEFT JOIN "Ep" e ON e."ownerId" = u.id
      LEFT JOIN "ApprovedDetail" ad ON ad."epId" = e.id
      WHERE u."isDisabled" = false
      GROUP BY u.id, u."fullName", d.name
      ORDER BY approvals DESC, u."fullName" ASC
    `) as ApprovalRow[];

    if (req.query['format'] === 'csv') {
      const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [
        'Member,Department,Approvals',
        ...rows.map((r) => [r.fullName, r.department, r.approvals].map(cell).join(',')),
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
