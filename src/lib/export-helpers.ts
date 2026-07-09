/**
 * Shared helpers for the production-grade chunked export pipeline.
 *
 * Storage policy:
 *   - Neon stores: ExportJob metadata, ExportChunk metadata, ExportLog entries.
 *   - Google Drive stores: ALL image binaries. They are NEVER persisted to Neon.
 *   - The final ZIP is streamed on-the-fly during /download — archiver pulls
 *     images directly from Drive and pipes them to the HTTP response.
 *
 * Pipeline lifecycle (driven by frontend calling POST /api/export/process):
 *   created → loading_products → downloading_images → writing_excel →
 *   building_zip → saving_package → completed
 *
 * Each /process invocation does ONE bounded unit of work and exits within
 * ~10-25 seconds. The frontend orchestrator immediately requests the next
 * chunk. There is no fire-and-forget background promise.
 *
 * Resumability:
 *   - The last successfully committed sourceRow is stored as `cursor` on
 *     ExportJob. If a /process request fails or the browser closes, the
 *     next request picks up from `cursor + 1`.
 *   - If a chunk fails, it is marked status='failed' on ExportChunk. The
 *     next /process call detects this and retries only that chunk (not the
 *     whole export). After MAX_CHUNK_RETRIES attempts, the job is marked
 *     failed but the chunks already completed are preserved.
 */

import { db } from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// Constants — chunk size comes from env var EXPORT_CHUNK_SIZE
// ─────────────────────────────────────────────────────────────

/**
 * Number of products processed in a single /process call.
 * Set via EXPORT_CHUNK_SIZE env var (default 100).
 * Vercel env: EXPORT_CHUNK_SIZE=100
 */
function resolveChunkSize(): number {
  const raw = process.env.EXPORT_CHUNK_SIZE;
  if (!raw) return 100;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 10 || parsed > 500) return 100;
  return parsed;
}
export const PRODUCT_BATCH_SIZE = resolveChunkSize();

/** Concurrency for image downloads within a single chunk. */
export const IMAGE_DOWNLOAD_CONCURRENCY = 5;

/**
 * Hard cap on images downloaded per chunk during the "downloading_images"
 * stage. The final ZIP downloads again on demand during /download, so this
 * cap only controls the progress-display phase, not the final output.
 */
export const MAX_IMAGES_PER_CHUNK = 400;

/** Maximum chunk retry attempts before failing the whole job. */
export const MAX_CHUNK_RETRIES = 3;

/**
 * Target size (in bytes) of each streamed chunk during /download.
 * Archiver output is piped to the response in chunks of this size; this
 * is purely for backpressure and does not get persisted anywhere.
 */
export const ZIP_STREAM_CHUNK_BYTES = 64 * 1024; // 64 KB per write

/** Hard ceiling on Vercel function duration we aim to stay well under (seconds). */
export const TARGET_MAX_DURATION_SECONDS = 25;

// ─────────────────────────────────────────────────────────────
// Stage definitions — used for percentage calculation
// ─────────────────────────────────────────────────────────────

export const STAGE_LABELS = {
  preparing:          'Preparing export...',
  loadingProducts:    'Loading products...',
  downloadingImages:  'Downloading images...',
  writingExcel:       'Writing Excel...',
  buildingZip:        'Building ZIP...',
  savingPackage:      'Saving package...',
  completed:          'Completed',
  failed:             'Failed',
  cancelled:          'Cancelled',
} as const;

/**
 * Stage weights (total = 100). The bulk of the time is in loading_products
 * + downloading_images (combined ~85%) because that's where Google Drive
 * fetches happen. Writing Excel + building ZIP + saving are fast in-memory
 * operations (or, for /download, streamed directly to the client).
 */
const STAGE_WEIGHTS = {
  preparing:         { start: 0,  end: 2  },
  loadingProducts:   { start: 2,  end: 45  },
  downloadingImages: { start: 45, end: 85  },
  writingExcel:      { start: 85, end: 92  },
  buildingZip:       { start: 92, end: 97  },
  savingPackage:     { start: 97, end: 100 },
} as const;

export function stagePct(
  stageKey: keyof typeof STAGE_WEIGHTS,
  completed: number,
  total: number
): number {
  const w = STAGE_WEIGHTS[stageKey];
  if (total <= 0) return w.end;
  const ratio = Math.min(1, Math.max(0, completed / total));
  return w.start + (w.end - w.start) * ratio;
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ProcessChunkResponse {
  status: string;          // 'created' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'
  stage: string;           // human-readable stage label
  percentage: number;      // 0-100
  totalProducts: number;
  processedProducts: number;
  totalImages: number;
  downloadedImages: number;
  failedImages: number;
  chunkCount: number;
  currentChunk: number | null;
  nextCursor: number | null;
  eta: string;             // 'MM:SS' or 'Calculating...'
  speed: string;           // e.g. '12.3 img/s' or '5.1 prod/s'
  estimatedSizeBytes: number | null;
  fileSize: number | null;  // actual file size (set when completed)
  blobExpiresAt: string | null;  // ISO timestamp when blob expires
  downloadUrl: string | null;
  done: boolean;
  error?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Filter helper — converts srFrom/srTo into a Prisma `where` clause
// ─────────────────────────────────────────────────────────────

export function buildWhereClause(srFrom: number | null, srTo: number | null): any {
  const where: any = {};
  if (srFrom != null && srTo != null) {
    where.sourceRow = { gte: srFrom, lte: srTo };
  }
  return where;
}

// ─────────────────────────────────────────────────────────────
// Folder name resolver — mirrors the existing convention:
//   ND-XXXX           if ndNumber present
//   Barcode_XXXX      else if barcode present
//   Product_XXXX      else (productId or sourceRow fallback)
// ─────────────────────────────────────────────────────────────

export function resolveFolderName(product: any): string {
  if (product.ndNumber && product.ndNumber.trim()) return product.ndNumber.trim();
  if (product.barcode) return `Barcode_${product.barcode}`;
  return `Product_${product.productId || product.sourceRow}`;
}

// ─────────────────────────────────────────────────────────────
// ETA / speed formatters
// ─────────────────────────────────────────────────────────────

/**
 * Compute ETA from actual elapsed time and current percentage.
 * Returns 'MM:SS' format, or 'Calculating...' if not enough data yet.
 */
export function formatEta(percentage: number, startedAt: Date | null | string): string {
  if (percentage >= 100) return '00:00';
  if (percentage < 2 || !startedAt) return 'Calculating...';
  const start = new Date(startedAt).getTime();
  const elapsed = (Date.now() - start) / 1000;
  if (elapsed < 2) return 'Calculating...';
  const totalEst = elapsed / (percentage / 100);
  const remaining = Math.max(0, totalEst - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatSpeed(count: number, startedAt: Date | null | string, unit: 'img' | 'prod'): string {
  if (!startedAt || count <= 0) return '';
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  if (elapsed < 1) return '';
  return `${(count / elapsed).toFixed(1)} ${unit}/s`;
}

// ─────────────────────────────────────────────────────────────
// Concurrency-limited map — keeps Google Drive fetches bounded
// ─────────────────────────────────────────────────────────────

export async function pooledMap<T, R>(
  concurrency: number,
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// ─────────────────────────────────────────────────────────────
// Job status snapshot — used by /process responses, /status, /events
// ─────────────────────────────────────────────────────────────

export async function getJobSnapshot(jobId: string) {
  return db.exportJob.findUnique({
    where: { id: jobId },
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
}

/**
 * Build the standardized ProcessChunkResponse from a job row.
 * Uses job.startedAt to compute ETA from actual elapsed time.
 * Includes downloadUrl, estimated size, and chunk info for the frontend.
 */
export function buildProcessResponse(job: any, reqBaseUrl?: string): ProcessChunkResponse {
  const percentage = job.percentage ?? 0;
  const eta = formatEta(percentage, job.startedAt);
  let speed = '';
  const stageLower = (job.stage || '').toLowerCase();
  if (stageLower.includes('download') || stageLower.includes('image')) {
    speed = formatSpeed(job.downloadedImages ?? 0, job.startedAt, 'img');
  } else if (stageLower.includes('product') || stageLower.includes('load')) {
    speed = formatSpeed(job.processedProducts ?? 0, job.startedAt, 'prod');
  }

  const downloadUrl =
    job.status === 'completed' && job.id
      ? `${reqBaseUrl || ''}/api/export/${job.id}/download`
      : job.downloadUrl ?? null;

  return {
    status: job.status,
    stage: job.stage || '',
    percentage,
    totalProducts: job.totalProducts ?? 0,
    processedProducts: job.processedProducts ?? 0,
    totalImages: job.totalImages ?? 0,
    downloadedImages: job.downloadedImages ?? 0,
    failedImages: job.failedImages ?? 0,
    chunkCount: job.chunkCount ?? 0,
    currentChunk: job.chunkCount ?? 0,
    nextCursor: job.cursor ?? null,
    eta,
    speed,
    estimatedSizeBytes: job.estimatedSizeBytes ?? null,
    fileSize: job.fileSize ?? null,
    blobExpiresAt: job.blobExpiresAt ? new Date(job.blobExpiresAt).toISOString() : null,
    downloadUrl,
    done: job.status === 'completed',
    error: job.errorMessage ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// Quality → Google Drive thumbnail size param
// ─────────────────────────────────────────────────────────────

export function qualityToSizeParam(quality: string): string {
  if (quality === 'high') return 'sz=w2000';
  if (quality === 'medium') return 'sz=w1000';
  return 'sz=w400'; // low
}

/**
 * Estimated bytes per image at each quality tier. Used to project the
 * final ZIP size for display before download starts.
 */
export function qualityToAvgBytes(quality: string): number {
  if (quality === 'high') return 600 * 1024;   // ~600 KB
  if (quality === 'medium') return 200 * 1024; // ~200 KB
  return 50 * 1024;                            // ~50 KB (low)
}

// ─────────────────────────────────────────────────────────────
// Thumbnail quality → Google Drive thumbnail URL size param
//
// Used ONLY by the 'excel-thumbnails' export mode. Controls the
// size of the thumbnail URL embedded in the IMAGE() formula.
// Does NOT affect downloaded images in the ZIP package.
// ─────────────────────────────────────────────────────────────

export type ThumbnailQuality = 'small' | 'medium' | 'large';

export function thumbnailQualityToSizeParam(q: string): string {
  if (q === 'small') return 'sz=w200';
  if (q === 'large') return 'sz=w600';
  return 'sz=w300'; // medium (default)
}

export function thumbnailQualityToPixels(q: string): number {
  if (q === 'small') return 200;
  if (q === 'large') return 600;
  return 300; // medium
}

/**
 * Build a Google Drive thumbnail URL suitable for Excel's IMAGE() function.
 * Format: https://drive.google.com/thumbnail?id=FILE_ID&sz=w300
 *
 * This URL returns the image directly (not a redirect to a sharing page),
 * which is what IMAGE() requires. Normal sharing links
 * (https://drive.google.com/file/d/.../view) do NOT work with IMAGE().
 */
export function buildDriveThumbnailUrl(driveFileId: string, thumbnailQuality: string): string {
  const sizeParam = thumbnailQualityToSizeParam(thumbnailQuality);
  return `https://drive.google.com/thumbnail?id=${driveFileId}&${sizeParam}`;
}

/**
 * Build a Google Drive full-image URL (direct download / thumbnail at max res).
 * Used for the "Direct Full Image URL" column.
 */
export function buildDriveFullImageUrl(driveFileId: string): string {
  return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w2000`;
}

/**
 * Build a Google Drive file view URL (sharing link, for human browsing).
 * Used for the "Google Drive URL" column (hyperlinked).
 */
export function buildDriveViewUrl(driveFileId: string): string {
  return `https://drive.google.com/file/d/${driveFileId}/view`;
}

// ─────────────────────────────────────────────────────────────
// Memory snapshot helper
// ─────────────────────────────────────────────────────────────

export function getMemoryUsageMb(): { rss: number; heap: number } {
  const m = process.memoryUsage();
  return {
    rss: Math.round(m.rss / 1024 / 1024),
    heap: Math.round(m.heapUsed / 1024 / 1024),
  };
}
