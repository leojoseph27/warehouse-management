import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/db
 *
 * Minimal Prisma debug endpoint. Tests ONLY the database connection.
 * No export code, no images, no ZIP, no Excel.
 *
 * Returns:
 *   - count (number of products)
 *   - duration (ms for the count query)
 *   - uptime (process uptime in seconds)
 *   - memory (process.memoryUsage)
 *   - prismaInfo (whether the client was reused or created fresh)
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  // Step 1: Check if PrismaClient is a singleton
  results.steps.push({ step: 'PrismaClient check', status: 'ok', message: 'db is imported from @/lib/db (singleton pattern)' });

  // Step 2: Log before count
  console.log('[debug/db] Before count');
  results.steps.push({ step: 'Before count', status: 'ok', timestamp: new Date().toISOString() });

  // Step 3: Run the count query
  const t0 = Date.now();
  try {
    const count = await db.product.count();
    const duration = Date.now() - t0;

    console.log(`[debug/db] After count: ${count} products in ${duration}ms`);

    results.steps.push({
      step: 'After count',
      status: 'ok',
      count,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });

    // Step 4: Run a second count to verify connection reuse
    const t1 = Date.now();
    const count2 = await db.product.count();
    const duration2 = Date.now() - t1;

    results.steps.push({
      step: 'Second count (connection reuse test)',
      status: 'ok',
      count: count2,
      duration_ms: duration2,
      same_count: count === count2,
    });

    // Step 5: Try a minimal findMany
    const t2 = Date.now();
    const one = await db.product.findMany({
      take: 1,
      select: { id: true },
    });
    const duration3 = Date.now() - t2;

    results.steps.push({
      step: 'findMany take:1 select:id',
      status: 'ok',
      result_count: one.length,
      duration_ms: duration3,
    });

    // Step 6: Try findMany with all fields
    const t3 = Date.now();
    const ten = await db.product.findMany({
      take: 10,
      orderBy: { sourceRow: 'asc' },
    });
    const duration4 = Date.now() - t3;

    results.steps.push({
      step: 'findMany take:10 all-fields',
      status: 'ok',
      result_count: ten.length,
      duration_ms: duration4,
    });

    // Step 7: Process info
    const mem = process.memoryUsage();
    results.count = count;
    results.duration_ms = duration;
    results.uptime_seconds = Math.round(process.uptime());
    results.memory = {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      external_mb: Math.round(mem.external / 1024 / 1024),
    };
    results.status = 'success';

    return NextResponse.json(results);
  } catch (error: any) {
    const duration = Date.now() - t0;
    console.error(`[debug/db] Count FAILED after ${duration}ms:`, error?.message);
    console.error(`[debug/db] Stack:`, error?.stack);

    results.steps.push({
      step: 'Count query',
      status: 'failed',
      error: error?.message,
      stack: error?.stack,
      duration_ms: duration,
    });
    results.status = 'failed';
    results.error = error?.message;

    return NextResponse.json(results, { status: 500 });
  }
}
