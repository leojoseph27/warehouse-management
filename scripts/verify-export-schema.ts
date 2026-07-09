// Comprehensive schema verification for production export pipeline
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Row = { [k: string]: any };

async function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  EXPORT PIPELINE SCHEMA VERIFICATION');
  console.log('══════════════════════════════════════════════════════════\n');

  // ── 1. Tables exist ──
  const tables = await prisma.$queryRaw<Row[]>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('export_jobs', 'export_chunks', 'export_logs')
    ORDER BY table_name;
  `;
  console.log('✓ Tables:');
  for (const t of tables) console.log(`    - ${t.table_name}`);

  // ── 2. Columns on each table ──
  for (const tableName of ['export_jobs', 'export_chunks', 'export_logs']) {
    const cols = await prisma.$queryRaw<Row[]>`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    console.log(`\n✓ ${tableName} columns (${cols.length} total):`);
    for (const c of cols) {
      const nullable = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
      console.log(`    ${c.column_name.padEnd(22)} ${String(c.data_type).padEnd(30)} ${nullable}${def}`);
    }
  }

  // ── 3. Indexes ──
  const indexes = await prisma.$queryRaw<Row[]>`
    SELECT indexname, tablename, indexdef 
    FROM pg_indexes 
    WHERE tablename IN ('export_jobs', 'export_chunks', 'export_logs')
    ORDER BY tablename, indexname;
  `;
  console.log('\n✓ Indexes:');
  for (const i of indexes) {
    console.log(`    ${i.tablename}.${i.indexname}`);
  }

  // ── 4. Foreign keys ──
  const fks = await prisma.$queryRaw<Row[]>`
    SELECT 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON rc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('export_jobs', 'export_chunks', 'export_logs');
  `;
  console.log('\n✓ Foreign keys:');
  for (const f of fks) {
    console.log(`    ${f.table_name}.${f.column_name} → ${f.foreign_table_name}.${f.foreign_column_name} (ON DELETE ${f.delete_rule}, ON UPDATE ${f.update_rule})`);
  }

  // ── 5. Unique constraints ──
  const uniques = await prisma.$queryRaw<Row[]>`
    SELECT 
      tc.table_name,
      tc.constraint_name,
      string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_name IN ('export_jobs', 'export_chunks', 'export_logs')
    GROUP BY tc.table_name, tc.constraint_name;
  `;
  console.log('\n✓ Unique constraints:');
  for (const u of uniques) {
    console.log(`    ${u.table_name}.${u.constraint_name} ON (${u.columns})`);
  }

  // ── 6. Migration history ──
  const migrations = await prisma.$queryRaw<Row[]>`
    SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
    FROM _prisma_migrations
    ORDER BY started_at;
  `;
  console.log('\n✓ Migration history:');
  for (const m of migrations) {
    const status = m.rolled_back_at ? 'ROLLED BACK' : (m.finished_at ? 'APPLIED' : 'PENDING');
    console.log(`    ${m.migration_name} — ${status}`);
  }

  // ── 7. Row counts ──
  const ej = await prisma.$queryRaw<Row[]>`SELECT COUNT(*)::int AS n FROM export_jobs`;
  const ec = await prisma.$queryRaw<Row[]>`SELECT COUNT(*)::int AS n FROM export_chunks`;
  const el = await prisma.$queryRaw<Row[]>`SELECT COUNT(*)::int AS n FROM export_logs`;
  console.log('\n✓ Row counts:');
  console.log(`    export_jobs:    ${ej[0].n}`);
  console.log(`    export_chunks:  ${ec[0].n}`);
  console.log(`    export_logs:    ${el[0].n}`);

  // ── 8. Product table size (for context) ──
  const products = await prisma.$queryRaw<Row[]>`SELECT COUNT(*)::int AS n FROM products`;
  const images = await prisma.$queryRaw<Row[]>`SELECT COUNT(*)::int AS n FROM product_images`;
  console.log(`\n✓ Source data:`);
  console.log(`    products:       ${products[0].n}`);
  console.log(`    product_images: ${images[0].n}`);

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  SCHEMA VERIFICATION COMPLETE');
  console.log('══════════════════════════════════════════════════════════\n');
}

main().finally(() => prisma.$disconnect());
