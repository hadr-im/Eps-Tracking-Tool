import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding departments...');

  const departments = [
    { id: 'dpt-gv',  name: 'GV'  },  // Global Volunteer = EXPA programme 9
    { id: 'dpt-gta', name: 'GTA' },  // Global Talent    = EXPA programme 8
    { id: 'dpt-gte', name: 'GTE' },  // Global Teacher   = EXPA programme 10
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name },
      create: dept,
    });
    console.log(` ${dept.name} (${dept.id})`);
  }

  console.log(' Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
