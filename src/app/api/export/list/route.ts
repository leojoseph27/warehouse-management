import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/export/list
 *
 * Returns recent export jobs for the dashboard.
 *
 * Query params:
 *   ?status=processing  → only jobs with the given status
 *   ?limit=20           → max results (default 20, capped at 100)
 *
 * Used by:
 *   - The dashboard "Export History" panel (planned).
 *   - Resume support: the frontend calls this with ?status=processing
 *     on page load. If a job is in progress, the user is offered the
 *     option to resume it.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(limitRaw || 20, 1), 100);

    const where: any = status ? { status } : {};
    const jobs = await db.exportJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        stage: true,
        percentage: true,
        exportMode: true,
        quality: true,
        srFrom: true,
        srTo: true,
        totalProducts: true,
        processedProducts: true,
        totalImages: true,
        downloadedImages: true,
        failedImages: true,
        chunkCount: true,
        cursor: true,
        estimatedSizeBytes: true,
        fileSize: true,
        blobUrl: true,
        blobExpiresAt: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      jobs,
      count: jobs.length,
    });
  } catch (error: any) {
    console.error('[export/list] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list exports', details: error?.message },
      { status: 500 }
    );
  }
}
