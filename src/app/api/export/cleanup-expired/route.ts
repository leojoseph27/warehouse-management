import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deleteExportFile } from '@/lib/export-storage';
import { createExportLogger } from '@/lib/export-logger';

export const runtime = 'nodejs';
// Cron job — give it time to clean up many blobs.
export const maxDuration = 60;

/**
 * POST /api/export/cleanup-expired
 *
 * Deletes Vercel Blob files whose retention period has expired.
 * Called daily by Vercel Cron (see vercel.json).
 *
 * Behavior:
 *   - Finds all ExportJob rows where blobExpiresAt < now AND blobUrl is not null.
 *   - For each: deletes the blob from Vercel Blob, then clears blobUrl, fileSize,
 *     blobExpiresAt on the job row.
 *   - Sets job status to 'expired' (so the download endpoint returns 410).
 *   - KEEPS the ExportJob row and all ExportLog rows for audit.
 *
 * Also cleans up 'orphaned' jobs (status=processing but updatedAt > 1 hour ago
 * and no progress) — marks them as 'failed' so they don't show as resumable.
 *
 * Can be invoked manually via POST, or automatically via Vercel Cron.
 *
 * Cron config (vercel.json):
 *   {
 *     "crons": [
 *       { "path": "/api/export/cleanup-expired", "schedule": "0 3 * * *" }
 *     ]
 *   }
 */
export async function POST(request: NextRequest) {
  const cleanupLogger = createExportLogger('system');
  const tStart = Date.now();

  try {
    // ── 1. Clean up expired blobs ──
    const expiredJobs = await db.exportJob.findMany({
      where: {
        blobExpiresAt: { lt: new Date() },
        blobUrl: { not: null },
      },
      select: { id: true, blobUrl: true, fileSize: true },
    });

    await cleanupLogger.info('cleanup', `Found ${expiredJobs.length} expired blobs to clean up`);

    let blobsDeleted = 0;
    let blobsFailed = 0;

    for (const job of expiredJobs) {
      if (!job.blobUrl) continue;
      try {
        await deleteExportFile(job.blobUrl);
        blobsDeleted++;
      } catch (err: any) {
        blobsFailed++;
        await cleanupLogger.warn('cleanup', `Failed to delete blob for job ${job.id}`, {
          blobUrl: job.blobUrl,
          error: err?.message,
        });
      }

      // Clear blob metadata on the job row regardless of delete success.
      // If the blob was already deleted manually, we still want to clear the URL.
      await db.exportJob.update({
        where: { id: job.id },
        data: {
          status: 'expired',
          blobUrl: null,
          fileSize: null,
          blobExpiresAt: null,
        },
      }).catch(() => {});
    }

    // ── 2. Clean up orphaned jobs (stuck processing) ──
    // A job is "orphaned" if it's been in 'processing' status for more than
    // 1 hour without any update. This can happen if the browser closed mid-export
    // and the user never resumed. We mark them as 'failed' so they don't show
    // in the resume banner forever.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const orphanedJobs = await db.exportJob.findMany({
      where: {
        status: 'processing',
        updatedAt: { lt: oneHourAgo },
      },
      select: { id: true, stage: true, percentage: true },
    });

    let orphansMarked = 0;
    for (const job of orphanedJobs) {
      await db.exportJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          stage: 'Stale (no progress for >1 hour)',
          errorMessage: 'Export was abandoned (browser closed without resume). Marked as failed by cleanup.',
          completedAt: new Date(),
        },
      }).catch(() => {});
      orphansMarked++;
      await cleanupLogger.info('cleanup', `Marked orphaned job ${job.id} as failed`, {
        stage: job.stage,
        percentage: job.percentage,
      });
    }

    // ── 3. Clean up orphaned chunks (chunks without a valid job) ──
    // This shouldn't happen due to cascade delete, but just in case.
    const orphanedChunks = await db.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM export_chunks c
      LEFT JOIN export_jobs j ON c."jobId" = j.id
      WHERE j.id IS NULL;
    ` as any[];
    const orphanedChunkCount = orphanedChunks[0]?.count || 0;
    if (orphanedChunkCount > 0) {
      await db.$executeRaw`
        DELETE FROM export_chunks c
        WHERE NOT EXISTS (
          SELECT 1 FROM export_jobs j WHERE j.id = c."jobId"
        );
      `;
      await cleanupLogger.warn('cleanup', `Deleted ${orphanedChunkCount} orphaned chunks`);
    }

    const elapsedMs = Date.now() - tStart;
    const summary = {
      blobsDeleted,
      blobsFailed,
      orphansMarked,
      orphanedChunksDeleted: orphanedChunkCount,
      elapsedMs,
    };

    await cleanupLogger.info('cleanup', 'Cleanup complete', summary);
    console.log('[export/cleanup-expired]', summary);

    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error: any) {
    console.error('[export/cleanup-expired] Error:', error);
    await cleanupLogger.error('cleanup', `Cleanup failed: ${error?.message}`, {
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: 'Cleanup failed', details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/cleanup-expired
 *
 * Also supports GET for easy manual testing in the browser.
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
