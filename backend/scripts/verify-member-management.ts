/*
  Verifies the three gaps fixed in this pass:
    1. A declined signup can be reversed by a VP
    2. Member management (roles, teams, dispatcher handover, disable)
    3. Department scoping on dashboards and EP lists

  Run with the dev server up:  npx ts-node -T scripts/verify-member-management.ts
  Creates and removes its own zz-mm-* accounts.
*/
import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { BcryptService } from '../src/Infrastructure/services/BcryptService';

const prisma = new PrismaClient();
const API = `http://localhost:${process.env.PORT ?? 4000}/api`;
const PASSWORD = 'password123';

const EMAILS = {
  vp: 'zz-mm-vp@example.com',
  tlA: 'zz-mm-tl-a@example.com',
  tlB: 'zz-mm-tl-b@example.com',
  member: 'zz-mm-member@example.com',
  applicant: 'zz-mm-applicant@example.com',
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

async function api(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, body };
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

async function run(): Promise<void> {
  await cleanup();

  // A department whose VP and dispatcher slots are both free.
  const departments = await prisma.department.findMany({ select: { id: true } });
  const occupied = new Set(
    (
      await prisma.user.findMany({
        where: { isDisabled: false, OR: [{ role: 'VP' }, { isDispatcher: true }] },
        select: { departmentId: true },
      })
    ).map((u) => u.departmentId),
  );
  const dept = departments.find((d) => !occupied.has(d.id))?.id;
  const otherDept = departments.find((d) => d.id !== dept)?.id;
  if (!dept || !otherDept) throw new Error('Need a department with free VP + dispatcher slots');
  console.log(`Using ${dept} (fixtures), ${otherDept} (foreign)`);

  const hash = await new BcryptService().hash(PASSWORD);
  const mk = (email: string, fullName: string, role: string, extra = {}) =>
    prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        passwordHash: hash,
        fullName,
        role: role as never,
        departmentId: dept,
        status: 'ACTIVE',
        ...extra,
      },
    });

  const vp = await mk(EMAILS.vp, 'ZZ MM VP', 'VP');
  const tlA = await mk(EMAILS.tlA, 'ZZ MM TL A', 'TEAM_LEADER', { isDispatcher: true });
  const tlB = await mk(EMAILS.tlB, 'ZZ MM TL B', 'TEAM_LEADER');
  const member = await mk(EMAILS.member, 'ZZ MM Member', 'MEMBER', { teamLeaderId: tlA.id });

  const vpToken = await login(EMAILS.vp);

  console.log('\n1. A declined signup can be reversed');
  const applicant = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: EMAILS.applicant,
      passwordHash: hash,
      fullName: 'ZZ MM Applicant',
      role: 'MEMBER',
      status: 'PENDING',
      requestedRole: 'MEMBER',
      requestedDepartmentId: dept,
    },
  });

  const rejected = await api(vpToken, `/users/${applicant.id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Wrong department' }),
  });
  check('decline succeeds', rejected.status === 200, `got ${rejected.status}`);

  const declinedList = await api(vpToken, '/users/pending?status=REJECTED');
  check(
    'declined requests are listable',
    declinedList.status === 200 &&
      declinedList.body.data.some((u: { id: string }) => u.id === applicant.id),
    `got ${declinedList.status}`,
  );

  const pendingList = await api(vpToken, '/users/pending');
  check(
    'declined request is NOT in the pending list',
    !pendingList.body.data.some((u: { id: string }) => u.id === applicant.id),
  );

  const undone = await api(vpToken, `/users/${applicant.id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ role: 'MEMBER', teamLeaderId: tlB.id }),
  });
  check('a declined request can still be approved', undone.status === 200, `got ${undone.status}`);
  check(
    'approving clears the rejection',
    undone.body?.data?.status === 'ACTIVE' && undone.body?.data?.departmentId === dept,
  );
  check('the applicant can now sign in', !!(await login(EMAILS.applicant)));

  console.log('\n2. Member management');
  const list = await api(vpToken, '/users/members');
  check('VP can list department members', list.status === 200, `got ${list.status}`);

  const promote = await api(vpToken, `/users/${member.id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'TEAM_LEADER' }),
  });
  check('member promoted to Team Leader', promote.status === 200, `got ${promote.status}`);
  check(
    'promotion clears their own team leader',
    promote.body?.data?.role === 'TEAM_LEADER' && promote.body?.data?.teamLeaderId === null,
  );

  const clash = await api(vpToken, `/users/${tlB.id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'TEAM_LEADER', isDispatcher: true }),
  });
  check(
    'a second dispatcher is refused',
    clash.status === 409,
    `got ${clash.status} ${JSON.stringify(clash.body)}`,
  );

  // Handover: disable the old dispatcher, then appoint the new one.
  await api(vpToken, `/users/${tlA.id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ isDisabled: true }),
  });
  const handover = await api(vpToken, `/users/${tlB.id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'TEAM_LEADER', isDispatcher: true }),
  });
  check(
    'dispatcher handover works once the old one is disabled',
    handover.status === 200 && handover.body?.data?.isDispatcher === true,
    `got ${handover.status}`,
  );

  const self = await api(vpToken, `/users/${vp.id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'MEMBER' }),
  });
  check('a VP cannot change their own access', self.status === 403, `got ${self.status}`);

  const toVp = await api(vpToken, `/users/${member.id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'VP' }),
  });
  check('nobody can be promoted to VP here', toVp.status === 400, `got ${toVp.status}`);

  console.log('\n3. Department scoping');
  const foreignDash = await api(vpToken, `/dashboard/department?departmentId=${otherDept}`);
  check(
    'VP dashboard refuses another department',
    foreignDash.status === 403,
    `got ${foreignDash.status}`,
  );

  const ownDash = await api(vpToken, `/dashboard/department?departmentId=${dept}`);
  check('VP dashboard allows their own department', ownDash.status === 200, `got ${ownDash.status}`);

  const foreignEps = await api(vpToken, `/approved-eps?departmentId=${otherDept}`);
  check(
    'approved EPs refuse another department',
    foreignEps.status === 403,
    `got ${foreignEps.status}`,
  );

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
