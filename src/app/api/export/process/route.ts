import { NextRequest, NextResponse } from 'next/server';
import { runChunkWorker } from '@/lib/export-chunk-worker';

export const runtime = 'nodejs';
// Each chunk processes 100-200 products + their images, targeting ≤ 25s.
// Vercel Hobby allows 10s by default; Pro allows up to 60s. We set 60s as a
// safety margin — workers should normally finish in 10-20s.
export const maxDuration = 60;

/**
 * POST /api/export/process
 *
 * Phase 2 of the chunked export pipeline.
 *
 * Processes exactly ONE chunk of work per request:
 *   - Stage 'created': runs COUNT query, transitions to loading_products.
 *   - Stage 'loading_products': loads ≤ PRODUCT_BATCH_SIZE products (cursor-
 *     based), downloads their images, persists as one ExportChunk row.
 *   - Stage 'building_zip': assembles the final ZIP from all chunks and
 *     persists as zip_part ExportChunk rows; marks job completed.
 *
 * The frontend orchestrator calls this endpoint repeatedly with the latest
 * cursor (returned in each response) until status='completed'.
 *
 * Body: { jobId: string, cursor?: number | null }
 *
 * Response: ProcessChunkResponse — see src/lib/export-helpers.ts
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const jobId: string | undefined = body.jobId;
    const cursor: number | null =
      body.cursor === null || body.cursor === undefined
        ? null
        : Number(body.cursor);

    console.log(`[export/process] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[export/process] REQUEST START — jobId=${jobId} cursor=${cursor}`);

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }

    const response = await runChunkWorker(jobId, cursor);

    const elapsed = Date.now() - t0;
    console.log(`[export/process] REQUEST END — ${elapsed}ms`);
    console.log(`[export/process] RESPONSE:`);
    console.log(`  status:              ${response.status}`);
    console.log(`  stage:               ${response.stage}`);
    console.log(`  percentage:          ${response.percentage}%`);
    console.log(`  cursor/nextCursor:   ${response.nextCursor}`);
    console.log(`  processedProducts:   ${response.processedProducts} / ${response.totalProducts}`);
    console.log(`  downloadedImages:    ${response.downloadedImages} / ${response.totalImages}`);
    console.log(`  chunkCount:          ${response.chunkCount}`);
    console.log(`  currentChunk:        ${response.currentChunk}`);
    console.log(`  fileSize:            ${response.fileSize}`);
    console.log(`  blobExpiresAt:       ${response.blobExpiresAt}`);
    console.log(`  downloadUrl:         ${response.downloadUrl}`);
    console.log(`  done:                ${response.done}`);
    if (response.error) {
      console.log(`  error:               ${response.error}`);
    }
    console.log(`[export/process] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return NextResponse.json(response);
  } catch (error: any) {
    const elapsed = Date.now() - t0;
    console.error(`[export/process] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.error(`[export/process] UNHANDLED ERROR after ${elapsed}ms`);
    console.error(`[export/process] Error:`, error?.message);
    console.error(`[export/process] Code:`, error?.code);
    console.error(`[export/process] Stack:`, error?.stack);
    console.error(`[export/process] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return NextResponse.json(
      {
        status: 'failed',
        stage: 'Failed',
        percentage: 0,
        totalProducts: 0,
        processedProducts: 0,
        totalImages: 0,
        downloadedImages: 0,
        failedImages: 0,
        chunkCount: 0,
        currentChunk: null,
        nextCursor: null,
        eta: '00:00',
        speed: '',
        estimatedSizeBytes: null,
        fileSize: null,
        blobExpiresAt: null,
        downloadUrl: null,
        done: true,
        error: error?.message || 'Unknown error',
        errorMessage: String(error?.message || error),
        errorCode: error?.code || null,
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
