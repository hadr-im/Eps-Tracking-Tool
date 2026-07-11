import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding departments...');

  const departments = [
    { id: 'dpt-iGT', name: 'Incoming Global Talent' },
    { id: 'dpt-IM', name: 'Information Management' }
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
