import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Neon connection...');
  const productCount = await prisma.product.count();
  console.log(`✓ Connected. Product count: ${productCount}`);
  
  const tableCheck = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'export%' 
    ORDER BY table_name;
  `;
  console.log('Existing export tables:', tableCheck);
}

main()
  .catch((e) => {
    console.error('✗ Connection failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
