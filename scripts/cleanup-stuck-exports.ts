// Clean up stuck export jobs from the old fire-and-forget system
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up stuck export_jobs...');
  const deleted = await prisma.exportJob.deleteMany({
    where: { status: { in: ['processing', 'pending', 'created'] } },
  });
  console.log(`Deleted ${deleted.count} stuck jobs.`);

  const remaining = await prisma.exportJob.count();
  console.log(`Remaining export_jobs: ${remaining}`);
}

main().finally(() => prisma.$disconnect());
