import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/export/[id]/logs
 *
 * Returns the ExportLog entries for a job, newest first.
 *
 * Query params:
 *   ?level=error  → only entries with the given level
 *   ?limit=200    → max results (default 200, capped at 1000)
 *
 * Used for inspecting failed exports: open this endpoint to see exactly
 * what happened, with timings and context for each step.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const limitRaw = parseInt(searchParams.get('limit') || '200', 10);
    const limit = Math.min(Math.max(limitRaw || 200, 1), 1000);

    const where: any = { jobId: id };
    if (level) where.level = level;

    const logs = await db.exportLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        timestamp: true,
        level: true,
        source: true,
        message: true,
        contextJson: true,
      },
    });

    // Parse contextJson for convenience.
    const parsed = logs.map((l: any) => ({
      ...l,
      context: l.contextJson ? JSON.parse(l.contextJson) : null,
      contextJson: undefined,
    }));

    return NextResponse.json({
      jobId: id,
      count: parsed.length,
      logs: parsed,
    });
  } catch (error: any) {
    console.error('[export/logs] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get export logs', details: error?.message },
      { status: 500 }
    );
  }
}
