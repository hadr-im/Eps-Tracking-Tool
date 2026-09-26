/*
  Temporary verification script for the signup-approval flow.
  Run:  npx ts-node -T scripts/verify-approval.ts
  Safe to delete — it creates and removes its own zz-test-* accounts.
*/
import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AuthRepository } from '../src/Infrastructure/repositories/AuthRepository';
import { AuthUseCase } from '../src/Application/use-cases/auth/AuthUseCase';
import { AccountApprovalUseCase } from '../src/Application/use-cases/user/AccountApprovalUseCase';
import { BcryptService } from '../src/Infrastructure/services/BcryptService';
import { JwtService } from '../src/Infrastructure/jwt/JwtService';
import { UserRole } from '../src/Domain/enums/UserRole';

const prisma = new PrismaClient();

const TEST_EMAILS = [
  'zz-test-member@example.com',
  'zz-test-dispatcher@example.com',
  'zz-test-vp@example.com',
  // Fixtures created by this script (a VP to approve with, a TL to assign to)
  'zz-fixture-vp@example.com',
  'zz-fixture-tl@example.com',
];

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label} ${detail}`);
  }
}

async function expectError(
  label: string,
  fn: () => Promise<unknown>,
  expectSubstring: string,
): Promise<void> {
  try {
    await fn();
    failed++;
    console.log(`  FAIL  ${label} — expected an error, got success`);
  } catch (err: unknown) {
    const msg = String((err as Error)?.message ?? err);
    if (msg.toLowerCase().includes(expectSubstring.toLowerCase())) {
      passed++;
      console.log(`  PASS  ${label}\n          -> "${msg}"`);
    } else {
      failed++;
      console.log(`  FAIL  ${label} — wrong error: "${msg}"`);
    }
  }
}

async function cleanup(): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { user: { email: { in: TEST_EMAILS } } } });
  await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
}

async function run(): Promise<void> {
  await cleanup();

  const repo = new AuthRepository();
  const mailStub = { sendOtp: async () => {}, sendDispatchNotification: async () => {} };
  const auth = new AuthUseCase(repo, new BcryptService(), new JwtService(), mailStub);
  const approvals = new AccountApprovalUseCase(repo);

  /*
    Self-contained fixtures. An earlier version pointed at specific seed
    accounts and broke the moment those were deleted, so the VP and Team
    Leader this script needs are created here and removed again at the end.

    The department is chosen at runtime: the VP and dispatcher slots both have
    to be free, or the partial unique indexes would reject the fixtures.
  */
  const departments = await prisma.department.findMany({ select: { id: true } });
  const occupied = await prisma.user.findMany({
    where: {
      isDisabled: false,
      OR: [{ role: UserRole.VP }, { isDispatcher: true }],
    },
    select: { departmentId: true },
  });
  const takenIds = new Set(occupied.map((u) => u.departmentId));
  const dept = departments.find((d) => !takenIds.has(d.id))?.id;
  if (!dept) {
    throw new Error(
      'Every department already has a VP or dispatcher; free one up to run this script.',
    );
  }
  /*
    A second department, with no VP, for the request that the fixture VP must
    NOT be able to review. Its VP slot has to be free so the signup in step 1
    passes validation.
  */
  const vpTaken = new Set(
    (
      await prisma.user.findMany({
        where: { isDisabled: false, role: UserRole.VP },
        select: { departmentId: true },
      })
    ).map((u) => u.departmentId),
  );
  const otherDept = departments.find((d) => d.id !== dept && !vpTaken.has(d.id))?.id;
  if (!otherDept) {
    throw new Error('Need a second department without a VP to run this script.');
  }
  console.log(`Using department ${dept} (fixtures), ${otherDept} (foreign request)`);

  const passwordHash = await new BcryptService().hash('password123');
  const vp1 = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: TEST_EMAILS[3]!,
      passwordHash,
      fullName: 'ZZ Fixture VP',
      role: UserRole.VP,
      departmentId: dept,
      status: 'ACTIVE',
    },
  });
  const tl1 = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: TEST_EMAILS[4]!,
      passwordHash,
      fullName: 'ZZ Fixture TL',
      role: UserRole.TEAM_LEADER,
      departmentId: dept,
      isDispatcher: true,
      status: 'ACTIVE',
    },
  });

  const vpCaller = {
    id: vp1.id,
    role: vp1.role as UserRole,
    departmentId: vp1.departmentId,
  };

  console.log('\n1. Signup does not grant what it is asked for');
  const { user: created } = await auth.signup({
    email: TEST_EMAILS[0]!,
    password: 'password123',
    fullName: 'ZZ Test Member',
    requestedRole: UserRole.TEAM_LEADER, // asking to lead a team
    requestedDepartmentId: otherDept,
  });
  check('status is PENDING', created.status === 'PENDING', `got ${created.status}`);
  check(
    'granted role is MEMBER, not the requested TEAM_LEADER',
    created.role === 'MEMBER',
    `got ${created.role}`,
  );
  check('granted department is null', created.departmentId === null, `got ${created.departmentId}`);
  check('granted isDispatcher is false', created.isDispatcher === false);
  check('the claim is recorded as requested', created.requested?.role === 'TEAM_LEADER');

  console.log('\n1b. A VP signup needs the setup code');
  await expectError(
    'VP signup without the code is refused',
    () =>
      auth.signup({
        email: TEST_EMAILS[2]!,
        password: 'password123',
        fullName: 'ZZ Test VP',
        requestedRole: UserRole.VP,
        requestedDepartmentId: otherDept,
      }),
    'setup code is required',
  );

  console.log('\n2. A pending account cannot sign in');
  await expectError(
    'login is refused while pending',
    () => auth.login({ email: TEST_EMAILS[0]!, password: 'password123' }),
    'waiting to be approved',
  );

  console.log('\n3. One dispatcher per department, enforced at signup');
  await expectError(
    'a second dispatcher is refused and names the holder',
    () =>
      auth.signup({
        email: TEST_EMAILS[1]!,
        password: 'password123',
        fullName: 'ZZ Test Dispatcher',
        requestedRole: UserRole.TEAM_LEADER,
        requestedDepartmentId: dept,
        requestedIsDispatcher: true,
      }),
    'already the dispatcher',
  );

  console.log('\n4. One VP per department, enforced at signup');
  await expectError(
    'a second VP is refused and names the holder',
    () =>
      auth.signup({
        email: TEST_EMAILS[2]!,
        password: 'password123',
        fullName: 'ZZ Test VP',
        requestedRole: UserRole.VP,
        requestedDepartmentId: dept,
      }),
    'already has a VP',
  );

  console.log('\n5. A VP cannot review another department');
  await expectError(
    'the fixture VP cannot approve a request for another department',
    () => approvals.approve(created.id, {}, vpCaller),
    'different department',
  );

  console.log('\n6. Approval grants access, with the VP correcting the claim');
  // Re-point the request at the VP's own department, as a real applicant would have.
  await prisma.user.update({
    where: { id: created.id },
    data: { requestedDepartmentId: dept },
  });
  const approved = await approvals.approve(
    created.id,
    { role: UserRole.MEMBER, teamLeaderId: tl1.id }, // VP downgrades the VP claim
    vpCaller,
  );
  check('status is ACTIVE', approved.status === 'ACTIVE', `got ${approved.status}`);
  check('granted role is the corrected MEMBER', approved.role === 'MEMBER', `got ${approved.role}`);
  check('granted department is set', approved.departmentId === dept, `got ${approved.departmentId}`);
  check('granted team leader is set', approved.teamLeaderId === tl1.id);

  console.log('\n7. The approved account can now sign in');
  const session = await auth.login({ email: TEST_EMAILS[0]!, password: 'password123' });
  check('login succeeds', typeof session.accessToken === 'string' && session.accessToken.length > 0);
  check('session carries the granted role', session.user.role === 'MEMBER');

  console.log('\n8. An account cannot be reviewed twice');
  await expectError(
    'approving an already-active account is refused',
    () => approvals.approve(created.id, {}, vpCaller),
    // Approved accounts are changed from member management, not re-approved
    'already active',
  );

  console.log('\n9. The database rejects a second dispatcher even if app checks are bypassed');
  try {
    await prisma.user.update({
      where: { id: created.id },
      data: { isDispatcher: true }, // the fixture TL already holds this department's slot
    });
    failed++;
    console.log('  FAIL  partial unique index did not fire');
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    check('partial unique index blocks the write', code === 'P2002', `got code ${code}`);
  }

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
