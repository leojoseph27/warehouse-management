import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const min = await prisma.product.aggregate({ _min: { sourceRow: true } });
  const max = await prisma.product.aggregate({ _max: { sourceRow: true } });
  console.log('sourceRow min:', min._min.sourceRow);
  console.log('sourceRow max:', max._max.sourceRow);

  const count5 = await prisma.product.count({ where: { sourceRow: { gte: 1, lte: 5 } } });
  console.log('count SR 1-5:', count5);

  const count100 = await prisma.product.count({ where: { sourceRow: { gte: 1, lte: 100 } } });
  console.log('count SR 1-100:', count100);

  const sample = await prisma.product.findMany({
    where: { sourceRow: { gte: 1 } },
    orderBy: { sourceRow: 'asc' },
    take: 5,
    select: { sourceRow: true, ndNumber: true, nameEn: true },
  });
  console.log('first 5 products:', sample);
}

main().finally(() => prisma.$disconnect());
