/*
  One-off repair for the wrong EXPA programme codes.

  The app previously mapped GV->9, GTA->8, GTE->10. EXPA actually uses GV=7,
  GTa=8, GTe=9, and 10 does not exist, so every lead was filed by asking for the
  wrong programme and then resolved against the wrong table.

  A blanket "move GV to GTE" would be wrong: ExpaLeadMapper.resolveProduct takes
  the FIRST recognised code in a person's selected_programmes, so someone with
  [7,8,9] belongs to GV, not GTE. This re-reads each lead's real programme list
  from EXPA and re-resolves it with the corrected map, which is exactly what a
  fresh import would now produce.

  Dry run (writes nothing):  npx ts-node scripts/fixProgrammeMapping.ts
  Apply:                     npx ts-node scripts/fixProgrammeMapping.ts --apply
*/

import 'dotenv/config';
import { GraphQLClient } from 'graphql-request';
import { prisma } from '../src/Infrastructure/Database/PrismaService';
import {
  Product,
  PROGRAMME_FROM_EXPA_CODE,
  PROGRAMME_DEPARTMENT_ID,
} from '../src/Domain/enums/Product';

const APPLY = process.argv.includes('--apply');

// Wide enough to cover every lead ever imported, including those from the
// earlier, broader sync window.
const FROM = '2025-01-01';
const TO = '2027-12-31';
const PER_PAGE = 100;

const QUERY = `
  query AllPeople($page: Int!, $perPage: Int!) {
    people(
      filters: { registered: { from: "${FROM}", to: "${TO}" } }
      per_page: $perPage
      page: $page
    ) {
      paging { total_pages total_items }
      data {
        id
        person_profile { selected_programmes }
      }
    }
  }
`;

interface PeopleResponse {
  people: {
    paging: { total_pages: number; total_items: number };
    data: { id: number | string; person_profile: { selected_programmes: number[] } | null }[];
  };
}

// Mirrors ExpaLeadMapper.resolveProduct: first recognised code wins.
function resolveProduct(codes: number[]): Product | null {
  for (const code of codes) {
    const product = PROGRAMME_FROM_EXPA_CODE[code];
    if (product) return product;
  }
  return null;
}

async function fetchProgrammesById(): Promise<Map<string, number[]>> {
  const apiUrl = process.env['EXPA_API_URL'];
  const token = process.env['EXPA_ACCESS_TOKEN'];
  if (!apiUrl || !token) throw new Error('Missing EXPA_API_URL or EXPA_ACCESS_TOKEN');

  const client = new GraphQLClient(apiUrl, { headers: { Authorization: token } });
  const map = new Map<string, number[]>();

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await client.request<PeopleResponse>(QUERY, { page, perPage: PER_PAGE });
    totalPages = data.people.paging.total_pages;

    for (const person of data.people.data) {
      map.set(String(person.id), person.person_profile?.selected_programmes ?? []);
    }

    process.stdout.write(`\r  fetched page ${page}/${totalPages} (${map.size} people)`);
    page++;
  }

  process.stdout.write('\n');
  return map;
}

async function main() {
  console.log(APPLY ? 'MODE: APPLY (will write)\n' : 'MODE: DRY RUN (no writes)\n');

  console.log('Reading programmes from EXPA...');
  const programmesById = await fetchProgrammesById();

  const eps = await prisma.ep.findMany({
    select: { id: true, fullName: true, product: true, departmentId: true },
  });
  console.log(`\nLeads in database: ${eps.length}\n`);

  const changes: { id: string; fullName: string; from: Product; to: Product }[] = [];
  const notInExpa: string[] = [];
  const unresolved: string[] = [];

  for (const ep of eps) {
    const codes = programmesById.get(ep.id);
    if (!codes) {
      notInExpa.push(ep.id);
      continue;
    }

    const correct = resolveProduct(codes);
    if (!correct) {
      unresolved.push(ep.id);
      continue;
    }

    if (correct !== (ep.product as unknown as Product)) {
      changes.push({
        id: ep.id,
        fullName: ep.fullName,
        from: ep.product as unknown as Product,
        to: correct,
      });
    }
  }

  const byMove = new Map<string, number>();
  for (const c of changes) {
    const key = `${c.from} -> ${c.to}`;
    byMove.set(key, (byMove.get(key) ?? 0) + 1);
  }

  console.log('Reassignments needed:');
  if (byMove.size === 0) console.log('  none');
  for (const [move, count] of byMove) console.log(`  ${move.padEnd(14)} ${count}`);

  console.log('\nSample (first 10):');
  for (const c of changes.slice(0, 10)) {
    console.log(`  ${c.id.padEnd(9)} ${c.from} -> ${c.to.padEnd(4)} ${c.fullName}`);
  }

  if (notInExpa.length) console.log(`\nNot found in EXPA (left untouched): ${notInExpa.length}`);
  if (unresolved.length) console.log(`No recognised programme (left untouched): ${unresolved.length}`);

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write these changes.');
    return;
  }

  if (changes.length === 0) {
    console.log('\nNothing to apply.');
    return;
  }

  console.log(`\nApplying ${changes.length} updates...`);

  // Grouped by target product so this is a handful of statements rather than
  // one round-trip per lead.
  const byTarget = new Map<Product, string[]>();
  for (const c of changes) {
    const list = byTarget.get(c.to) ?? [];
    list.push(c.id);
    byTarget.set(c.to, list);
  }

  await prisma.$transaction(
    [...byTarget].map(([product, ids]) =>
      prisma.ep.updateMany({
        where: { id: { in: ids } },
        data: {
          product: product as never,
          departmentId: PROGRAMME_DEPARTMENT_ID[product],
        },
      }),
    ),
  );

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('\nFailed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
