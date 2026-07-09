import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
// This endpoint just creates a job record and returns immediately.
// The actual work happens in /api/export/process, called repeatedly by the frontend.
export const maxDuration = 10;

/**
 * POST /api/export/start
 *
 * Phase 1 of the chunked export pipeline.
 *
 * Responsibilities:
 *   - Create an ExportJob record in the database.
 *   - Persist: export mode, image quality, SR filters, initial stage, zero progress.
 *   - Return { jobId, status: 'created' } immediately.
 *
 * This endpoint does NOT:
 *   - Download any images.
 *   - Run any database COUNT queries.
 *   - Start any background promise.
 *
 * The frontend orchestrator (export-progress-dialog.tsx) drives the pipeline
 * by repeatedly calling POST /api/export/process with the jobId until
 * status='completed'.
 *
 * Schema note: This route uses ONLY fields that exist in the current schema
 * (blobUrl, blobExpiresAt, fileSize, cursor, chunkCount, etc.). The legacy
 * resultBlob/resultSize/zipPartCount columns were dropped in migration
 * 20260709000000_export_pipeline_production and must never be referenced.
 */
export async function POST(request: NextRequest) {
  console.log('[export/start] POST entered');
  const t0 = Date.now();

  try {
    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));
    console.log('[export/start] body:', JSON.stringify(body));

    const exportMode = body.exportMode || 'excel-package';
    const quality = body.quality || 'high';
    const srFrom = Number.isFinite(body.srFrom) ? Number(body.srFrom) : null;
    const srTo = Number.isFinite(body.srTo) ? Number(body.srTo) : null;

    console.log('[export/start] params:', { exportMode, quality, srFrom, srTo });

    // Validate SR range if provided
    if (srFrom != null && srTo != null && srFrom > srTo) {
      console.log('[export/start] SR validation failed');
      return NextResponse.json(
        { error: 'srFrom must be less than or equal to srTo' },
        { status: 400 }
      );
    }

    // ── Verify Prisma client is healthy ──
    if (!db?.exportJob?.create) {
      console.error('[export/start] Prisma client not properly initialized');
      return NextResponse.json(
        {
          error: 'Prisma client not initialized',
          hint: 'Run: npx prisma generate. If on Vercel, clear build cache and redeploy.',
        },
        { status: 500 }
      );
    }

    // ── Create the ExportJob row ──
    // IMPORTANT: only fields that exist in the current schema.
    // No resultBlob, no resultSize, no zipPartCount.
    const createData = {
      status: 'created',
      stage: 'Initializing...',
      percentage: 0,
      exportMode,
      quality,
      srFrom: srFrom ?? null,
      srTo: srTo ?? null,
      cursor: null,
      chunkCount: 0,
      failedChunkCount: 0,
      elapsedMs: 0,
      totalProducts: 0,
      processedProducts: 0,
      totalImages: 0,
      downloadedImages: 0,
      failedImages: 0,
    };

    console.log('[export/start] creating ExportJob with data:', JSON.stringify(createData));

    const job = await db.exportJob.create({ data: createData });

    console.log(
      `[export/start] [${Date.now() - t0}ms] Job created. id=${job.id} mode=${exportMode} quality=${quality} srFrom=${srFrom} srTo=${srTo}`
    );

    return NextResponse.json({
      jobId: job.id,
      status: 'created',
    });
  } catch (error: any) {
    const elapsedMs = Date.now() - t0;
    console.error('[export/start] FAILED after', elapsedMs, 'ms');
    console.error('[export/start] Error:', error?.message);
    console.error('[export/start] Code:', error?.code);
    console.error('[export/start] Stack:', error?.stack);

    // Detect the specific P2022 error (column does not exist) and give
    // actionable guidance for the most common stale-client scenario.
    const isMissingColumn = error?.code === 'P2022';
    const mentionsResultBlob = String(error?.message || '').includes('resultBlob');

    return NextResponse.json(
      {
        error: 'Failed to start export',
        errorMessage: String(error?.message || error),
        errorCode: error?.code || null,
        errorName: error?.constructor?.name || typeof error,
        stack: error instanceof Error ? error.stack : null,
        isMissingColumn,
        mentionsResultBlob,
        hint:
          isMissingColumn && mentionsResultBlob
            ? 'Stale Prisma client. The resultBlob column was dropped in migration 20260709000000. Run: npx prisma generate, then redeploy with build cache cleared.'
            : isMissingColumn
            ? 'Database schema mismatch. Run: npx prisma migrate deploy on production.'
            : 'See error details above.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/start
 *
 * Lightweight diagnostics endpoint. Useful for verifying deployment freshness
 * and Prisma client health without creating a job. Safe to call from a browser
 * for quick deployment verification.
 */
export async function GET() {
  try {
    const reachable = await db.exportJob
      .findFirst({ select: { id: true } })
      .then(() => true)
      .catch(() => false);

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || '(not set)',
        vercelEnv: process.env.VERCEL_ENV || '(not set)',
        vercelRegion: process.env.VERCEL_REGION || '(not set)',
        nodeVersion: process.version,
        prismaClientOk: !!db?.exportJob?.create,
        dbReachable: reachable,
        env: {
          DATABASE_URL_exists: !!process.env.DATABASE_URL,
          BLOB_READ_WRITE_TOKEN_exists: !!process.env.BLOB_READ_WRITE_TOKEN,
          EXPORT_CHUNK_SIZE: process.env.EXPORT_CHUNK_SIZE || '(default 100)',
          ZIP_RETENTION_HOURS: process.env.ZIP_RETENTION_HOURS || '(default 48)',
        },
      },
      { headers: { 'Cache-Control': 'no-cache' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: String(error?.message || error),
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
