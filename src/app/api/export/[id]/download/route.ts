import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createExportLogger } from '@/lib/export-logger';
import { streamExportFile, getBlobMetadata } from '@/lib/export-storage';

export const runtime = 'nodejs';
// Download streams a pre-built ZIP from Vercel Blob — should be near-instant.
// We set 60s as a safety margin for very large files on slow connections.
export const maxDuration = 60;

/**
 * GET /api/export/[id]/download
 *
 * Streams the pre-built ZIP (or Excel) file from Vercel Blob.
 *
 * This endpoint is INTENTIONALLY lightweight:
 *   - No Excel rebuild.
 *   - No Google Drive image refetch.
 *   - No ZIP regeneration.
 *
 * The ZIP was built ONCE during the 'building_zip' stage of /process and
 * uploaded to Vercel Blob. This endpoint just fetches it from Blob and
 * pipes it to the HTTP response.
 *
 * Response time: typically < 100ms to first byte (Vercel-to-Vercel internal).
 *
 * If the blob has been deleted (e.g., after retention expiry), returns 410 Gone
 * with a helpful message. The ExportJob row is still kept for audit.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const logger = createExportLogger(id);
  const tStart = Date.now();

  try {
    const job = await db.exportJob.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        exportMode: true,
        blobUrl: true,
        fileSize: true,
        blobExpiresAt: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Export job not found' },
        { status: 404 }
      );
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Export is not completed yet', status: job.status },
        { status: 400 }
      );
    }

    if (!job.blobUrl) {
      // Job is marked completed but the blob is gone (retention expired).
      await db.exportJob.update({
        where: { id },
        data: { status: 'expired', blobUrl: null, fileSize: null },
      }).catch(() => {});
      return NextResponse.json(
        {
          error: 'The export file has expired and been deleted.',
          jobId: id,
          expiredAt: job.blobExpiresAt,
          message: 'Re-run the export to generate a new file.',
        },
        { status: 410 }
      );
    }

    // Verify the blob still exists in Vercel Blob.
    const blobMeta = await getBlobMetadata(job.blobUrl);
    if (!blobMeta) {
      // Blob is gone — mark the job as expired.
      await db.exportJob.update({
        where: { id },
        data: { status: 'expired', blobUrl: null, fileSize: null },
      }).catch(() => {});
      await logger.warn('download', 'Blob not found — marking job as expired', {
        blobUrl: job.blobUrl,
      });
      return NextResponse.json(
        {
          error: 'The export file has expired and been deleted from storage.',
          jobId: id,
          message: 'Re-run the export to generate a new file.',
        },
        { status: 410 }
      );
    }

    const isExcelPackage = job.exportMode === 'excel-package';
    const contentType = isExcelPackage
      ? 'application/zip'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = isExcelPackage
      ? 'product_export_package.zip'
      : 'products_export.xlsx';

    // ── Stream the pre-built ZIP from Vercel Blob ──
    const blobResponse = await streamExportFile(job.blobUrl);
    if (!blobResponse.ok || !blobResponse.body) {
      await logger.error('download', `Blob fetch failed: HTTP ${blobResponse.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch export file from storage' },
        { status: 502 }
      );
    }

    // Convert the Web ReadableStream to a Node ReadableStream for NextResponse.
    // NextResponse accepts a ReadableStream directly in edge runtime, but for
    // nodejs runtime we need to wrap it.
    const stream = blobResponse.body as unknown as ReadableStream<Uint8Array>;

    const headers: Record<string, string> = {
      'Content-Type': blobMeta.contentType || contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-transform',
      'X-Export-Job-Id': id,
    };
    if (job.fileSize && job.fileSize > 0) {
      headers['Content-Length'] = String(job.fileSize);
    }

    const responseTimeMs = Date.now() - tStart;
    await logger.info('download', 'Streaming pre-built ZIP from Blob', {
      blobUrl: job.blobUrl,
      fileSize: job.fileSize,
      fileSizeMb: job.fileSize ? (job.fileSize / 1024 / 1024).toFixed(2) : 'unknown',
      responseTimeMs,
      blobExpiresAt: job.blobExpiresAt,
    });

    return new NextResponse(stream, { headers });
  } catch (error: any) {
    console.error('[export/download] Error:', error);
    await logger.error('download', `Download failed: ${error?.message}`, {
      stack: error?.stack,
      elapsedMs: Date.now() - tStart,
    });
    return NextResponse.json(
      { error: 'Failed to download export', details: error?.message },
      { status: 500 }
    );
  }
}
