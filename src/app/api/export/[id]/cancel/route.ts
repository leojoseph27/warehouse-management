import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createExportLogger } from '@/lib/export-logger';
import { deleteExportFile } from '@/lib/export-storage';

export const runtime = 'nodejs';

/**
 * POST /api/export/[id]/cancel
 *
 * Marks an export job as cancelled. The frontend orchestrator stops calling
 * /api/export/process immediately on cancel. Any in-flight /process request
 * will complete its current chunk normally (we don't interrupt mid-chunk),
 * but the next /process call will see status='cancelled' and refuse to do
 * more work.
 *
 * Cleanup behavior:
 *   - Deletes the Vercel Blob file if it was already uploaded (blobUrl set).
 *   - Deletes all ExportChunk rows for this job.
 *   - KEEPS ExportLog rows — audit trail.
 *   - KEEPS the ExportJob row — shows in history with status='cancelled'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const logger = createExportLogger(id);

  try {
    const job = await db.exportJob.findUnique({
      where: { id },
      select: { id: true, status: true, chunkCount: true, blobUrl: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      );
    }

    // Already terminal — nothing to cancel.
    if (['completed', 'failed', 'cancelled', 'expired'].includes(job.status)) {
      return NextResponse.json({
        jobId: id,
        status: job.status,
        message: `Job is already in terminal state: ${job.status}`,
      });
    }

    await logger.info('cancel', 'Cancellation requested by user', {
      previousStatus: job.status,
      chunkCount: job.chunkCount,
      hasBlob: !!job.blobUrl,
    });

    // Mark as cancelled.
    await db.exportJob.update({
      where: { id },
      data: {
        status: 'cancelled',
        stage: 'Cancelled',
        completedAt: new Date(),
      },
    });

    // Delete the blob if it was uploaded (e.g., user cancelled after
    // the ZIP was built but before download).
    let blobDeleted = false;
    if (job.blobUrl) {
      await deleteExportFile(job.blobUrl);
      blobDeleted = true;
      await db.exportJob.update({
        where: { id },
        data: { blobUrl: null, fileSize: null, blobExpiresAt: null },
      });
    }

    // Clean up chunks (keep logs for audit).
    const deletedChunks = await db.exportChunk.deleteMany({
      where: { jobId: id },
    });

    await logger.info('cancel', 'Cancellation complete', {
      deletedChunks: deletedChunks.count,
      blobDeleted,
    });

    console.log(`[Export ${id}] Job cancelled by user. Deleted ${deletedChunks.count} chunks, blob deleted: ${blobDeleted}.`);

    return NextResponse.json({
      jobId: id,
      status: 'cancelled',
      message: 'Export cancelled successfully.',
      deletedChunks: deletedChunks.count,
      blobDeleted,
    });
  } catch (error: any) {
    console.error('[export/cancel] Error:', error);
    await logger.error('cancel', `Cancellation failed: ${error?.message}`, {
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: 'Failed to cancel export', details: error?.message },
      { status: 500 }
    );
  }
}
