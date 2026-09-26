/*
  Verifies EP/dashboard visibility rules and rate limiting over real HTTP.
  Run with the dev server up:  npx ts-node -T scripts/verify-access-control.ts
  Creates and removes its own zz-ac-* accounts.
*/
import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { BcryptService } from '../src/Infrastructure/services/BcryptService';

const prisma = new PrismaClient();
const API = `http://localhost:${process.env.PORT ?? 4000}/api`;
const PASSWORD = 'password123';

/*
  Chosen at runtime: the dispatcher check needs a department whose dispatcher
  slot is free, and the one_dispatcher_per_department index would reject the
  write otherwise. Never clears an existing dispatcher — that is real data.
*/
let DEPT = '';

const EMAILS = {
  tlA: 'zz-ac-tl-a@example.com',
  tlB: 'zz-ac-tl-b@example.com',
  memberA: 'zz-ac-member-a@example.com',
  memberB: 'zz-ac-member-b@example.com',
  limiter: 'zz-ac-limiter@example.com',
};

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label} ${detail}`);
  }
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = (await res.json()) as { accessToken?: string; message?: string };
  if (!body.accessToken) throw new Error(`login failed for ${email}: ${body.message}`);
  return body.accessToken;
}

async function getEps(token: string, memberId?: string): Promise<number> {
  const url = memberId ? `${API}/eps?memberId=${memberId}` : `${API}/eps`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.status;
}

async function cleanup(): Promise<void> {
  const emails = Object.values(EMAILS);
  await prisma.ep.updateMany({
    where: { owner: { email: { in: emails } } },
    data: { ownerId: null },
  });
  await prisma.refreshToken.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

async function createUser(
  email: string,
  fullName: string,
  role: 'MEMBER' | 'TEAM_LEADER',
  teamLeaderId: string | null,
): Promise<string> {
  const passwordHash = await new BcryptService().hash(PASSWORD);
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      fullName,
      role,
      departmentId: DEPT,
      teamLeaderId,
      status: 'ACTIVE',
    },
  });
  return user.id;
}

async function run(): Promise<void> {
  await cleanup();

  const departments = await prisma.department.findMany({ select: { id: true } });
  const taken = new Set(
    (
      await prisma.user.findMany({
        where: { isDispatcher: true, isDisabled: false },
        select: { departmentId: true },
      })
    ).map((u) => u.departmentId),
  );
  const freeDept = departments.find((d) => !taken.has(d.id));
  DEPT = freeDept?.id ?? departments[0]!.id;
  console.log(`Using department ${DEPT} (dispatcher slot ${freeDept ? 'free' : 'TAKEN'})`);

  const tlA = await createUser(EMAILS.tlA, 'ZZ TL A', 'TEAM_LEADER', null);
  const tlB = await createUser(EMAILS.tlB, 'ZZ TL B', 'TEAM_LEADER', null);
  const memberA = await createUser(EMAILS.memberA, 'ZZ Member A', 'MEMBER', tlA);
  const memberB = await createUser(EMAILS.memberB, 'ZZ Member B', 'MEMBER', tlB);
  await createUser(EMAILS.limiter, 'ZZ Limiter', 'MEMBER', tlA);

  const tokenMemberA = await login(EMAILS.memberA);
  const tokenTlA = await login(EMAILS.tlA);

  console.log('\n1. A member cannot read another member (the IDOR)');
  check('own EPs allowed', (await getEps(tokenMemberA, memberA)) === 200);
  check(
    "another member's EPs refused",
    (await getEps(tokenMemberA, memberB)) === 403,
    `got ${await getEps(tokenMemberA, memberB)}`,
  );
  check(
    "their Team Leader's EPs refused",
    (await getEps(tokenMemberA, tlA)) === 403,
  );
  check('no memberId still returns own EPs', (await getEps(tokenMemberA)) === 200);

  console.log('\n2. A Team Leader sees only their own team');
  check('own member allowed', (await getEps(tokenTlA, memberA)) === 200);
  check(
    "another TL's member refused",
    (await getEps(tokenTlA, memberB)) === 403,
    `got ${await getEps(tokenTlA, memberB)}`,
  );
  check('themselves allowed', (await getEps(tokenTlA, tlA)) === 200);

  console.log('\n3. Dispatcher TL sees the whole department');
  if (!freeDept) {
    console.log('  SKIP  no department with a free dispatcher slot');
  } else {
    await prisma.user.update({ where: { id: tlA }, data: { isDispatcher: true } });
    const tokenDispatcher = await login(EMAILS.tlA);
    const status = await getEps(tokenDispatcher, memberB);
    check("another TL's member allowed for a dispatcher", status === 200, `got ${status}`);
    await prisma.user.update({ where: { id: tlA }, data: { isDispatcher: false } });
  }

  // GET /dashboard/member/:id is TL/VP only at the route level, so this is
  // tested with a Team Leader token — a member is already blocked earlier.
  console.log('\n4. Member dashboards follow the same team rules');
  const dash = async (token: string, userId: string): Promise<number> =>
    (await fetch(`${API}/dashboard/member/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).status;
  const ownTeamDash = await dash(tokenTlA, memberA);
  const otherTeamDash = await dash(tokenTlA, memberB);
  check("own member's dashboard allowed", ownTeamDash === 200, `got ${ownTeamDash}`);
  check(
    "another TL's member dashboard refused",
    otherTeamDash === 403,
    `got ${otherTeamDash}`,
  );

  console.log('\n5. Rate limiting: 100 requests per minute, per user');
  const tokenLimiter = await login(EMAILS.limiter);
  let firstLimited = 0;
  for (let i = 1; i <= 115; i++) {
    const res = await fetch(`${API}/health`, {
      headers: { Authorization: `Bearer ${tokenLimiter}` },
    });
    if (res.status === 429) {
      firstLimited = i;
      break;
    }
  }
  check(
    `limiter fires just after 100 (fired at ${firstLimited})`,
    firstLimited >= 100 && firstLimited <= 103,
    `got ${firstLimited}`,
  );

  // Other users must be unaffected — the budget is per user, not global.
  const stillOk = await getEps(tokenMemberA, memberA);
  check("a different user is not throttled", stillOk === 200, `got ${stillOk}`);

  await cleanup();

  console.log(`\n${'='.repeat(52)}`);
  console.log(`${passed} passed, ${failed} failed`);
  console.log('='.repeat(52));

  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(async (err) => {
  console.error('\nSCRIPT ERROR:', err);
  await cleanup();
  await prisma.$disconnect();
  process.exit(1);
});
