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
  try {
    const body = await request.json().catch(() => ({}));
    const jobId: string | undefined = body.jobId;
    const cursor: number | null =
      body.cursor === null || body.cursor === undefined
        ? null
        : Number(body.cursor);

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }

    const response = await runChunkWorker(jobId, cursor);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[export/process] Error:', error);
    return NextResponse.json(
      {
        status: 'failed',
        stage: 'Failed',
        percentage: 0,
        totalProducts: 0,
        processedProducts: 0,
        totalImages: 0,
        downloadedImages: 0,
        nextCursor: null,
        eta: '00:00',
        speed: '',
        done: true,
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
