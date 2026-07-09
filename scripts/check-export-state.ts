// Check current export_jobs state
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM export_jobs`;
  console.log('Total export_jobs rows:', total);
  
  const byStatus = await prisma.$queryRaw`
    SELECT status, COUNT(*)::int AS count 
    FROM export_jobs 
    GROUP BY status 
    ORDER BY count DESC;
  `;
  console.log('By status:', byStatus);
  
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('export_jobs', 'export_chunks', 'export_logs')
    ORDER BY table_name;
  `;
  console.log('Tables:', tables);
  
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'export_jobs' 
    ORDER BY ordinal_position;
  `;
  console.log('export_jobs columns:', cols);
}

main().finally(() => prisma.$disconnect());
