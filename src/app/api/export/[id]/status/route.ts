import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { formatEta, formatSpeed } from '@/lib/export-helpers';

export const runtime = 'nodejs';

/**
 * GET /api/export/[id]/status
 *
 * Returns the current status of an export job, including:
 *   - All progress counters (products, images, chunks)
 *   - ETA + speed (computed from startedAt)
 *   - downloadUrl (only set when status=completed)
 *   - estimatedSizeBytes (for download size display)
 *   - cursor (for resume support)
 *
 * The frontend orchestrator primarily uses /process responses, but this
 * endpoint is useful for:
 *   - Resuming an in-progress job after a page refresh.
 *   - Checking if a job is completed (e.g., from the dashboard).
 *   - External integrations that poll for status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.exportJob.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        stage: true,
        percentage: true,
        exportMode: true,
        quality: true,
        srFrom: true,
        srTo: true,
        cursor: true,
        chunkCount: true,
        failedChunkCount: true,
        elapsedMs: true,
        totalProducts: true,
        processedProducts: true,
        totalImages: true,
        downloadedImages: true,
        failedImages: true,
        estimatedSizeBytes: true,
        fileSize: true,
        blobUrl: true,
        blobExpiresAt: true,
        downloadUrl: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      );
    }

    // Compute ETA + speed.
    const eta = formatEta(job.percentage, job.startedAt);
    const stageLower = (job.stage || '').toLowerCase();
    const speed =
      stageLower.includes('download') || stageLower.includes('image')
        ? formatSpeed(job.downloadedImages, job.startedAt, 'img')
        : stageLower.includes('product') || stageLower.includes('load')
        ? formatSpeed(job.processedProducts, job.startedAt, 'prod')
        : '';

    // Count completed/failed chunks for display.
    const chunkStats = await db.exportChunk.groupBy({
      by: ['status'],
      where: { jobId: id },
      _count: { status: true },
    });
    const completedChunks = chunkStats.find((c: any) => c.status === 'completed')?._count?.status || 0;
    const failedChunks = chunkStats.find((c: any) => c.status === 'failed')?._count?.status || 0;

    return NextResponse.json({
      ...job,
      eta,
      speed,
      completedChunks,
      failedChunks,
      downloadUrl: job.status === 'completed'
        ? `/api/export/${job.id}/download`
        : null,
      done: job.status === 'completed',
    });
  } catch (error: any) {
    console.error('[export/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get export status', details: error?.message },
      { status: 500 }
    );
  }
}
