/**
 * Object storage abstraction for the export pipeline.
 *
 * Uses Vercel Blob to store the final ZIP file. The ZIP is built ONCE
 * during the 'building_zip' stage and uploaded here. The download endpoint
 * streams the pre-built ZIP from Blob — no rebuild, no image refetch.
 *
 * Storage policy:
 *   - Neon: NEVER stores image binaries or ZIP files.
 *   - Google Drive: source of truth for product images.
 *   - Vercel Blob: temporary storage for completed ZIP files.
 *
 * Retention:
 *   - Each blob has a blobExpiresAt timestamp (completedAt + ZIP_RETENTION_HOURS).
 *   - The /api/export/cleanup-expired endpoint (invoked by Vercel Cron daily)
 *     finds expired jobs, deletes their blobs, and clears blobUrl on the job.
 *   - ExportJob + ExportLog rows are kept permanently for audit.
 *
 * Required env var:
 *   BLOB_READ_WRITE_TOKEN — Vercel Blob access token.
 *   Get it from: Vercel Dashboard → Project → Storage → Blob → Connect.
 *
 *   Also set ZIP_RETENTION_HOURS (default 48) to control how long blobs live.
 */

import { put, del, head } from '@vercel/blob';

/**
 * How long to keep generated ZIP files in Vercel Blob.
 * Set via ZIP_RETENTION_HOURS env var (default 48).
 * ExportJob metadata + ExportLog rows are kept permanently regardless.
 */
export function getZipRetentionHours(): number {
  const raw = process.env.ZIP_RETENTION_HOURS;
  if (!raw) return 48;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 720) return 48; // max 30 days
  return parsed;
}

/**
 * Compute the expiry timestamp for a blob created now.
 */
export function computeBlobExpiresAt(): Date {
  const hours = getZipRetentionHours();
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Upload a ZIP (or Excel) file to Vercel Blob.
 *
 * @param jobId — ExportJob ID, used in the blob pathname for traceability.
 * @param body — The file content as a Buffer, ReadableStream, or string.
 * @param filename — The download filename (e.g., 'product_export_package.zip').
 * @param contentType — MIME type ('application/zip' or Excel MIME).
 * @returns { url, size } — the public Blob URL and file size in bytes.
 *
 * The blob is stored with a random suffix for unguessability (security through
 * obscurity + the URL is never exposed to the client; download streams through
 * our API).
 */
export async function uploadExportFile(
  jobId: string,
  body: Buffer | ReadableStream,
  filename: string,
  contentType: string,
): Promise<{ url: string; size: number }> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN environment variable is not set. ' +
      'Add it in Vercel → Project → Storage → Blob → Connect, then redeploy.'
    );
  }

  // Pathname includes jobId for traceability in the Vercel dashboard.
  // addRandomSuffix defaults to true, giving us an unguessable URL.
  const pathname = `exports/${jobId}/${filename}`;

  const blob = await put(pathname, body, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
    // Vercel Blob doesn't support Content-Disposition directly,
    // but the browser will use the filename from the pathname's last segment.
  });

  // PutBlobResult doesn't include size, so we fetch it via head().
  // For Buffer bodies we can compute it directly to avoid the extra call.
  let size: number;
  if (Buffer.isBuffer(body)) {
    size = body.length;
  } else {
    const details = await head(blob.url);
    size = details?.size ?? 0;
  }

  return {
    url: blob.url,
    size,
  };
}

/**
 * Stream a previously-uploaded ZIP from Vercel Blob.
 *
 * Used by the /download endpoint. This is a server-side fetch from Blob's
 * CDN — fast (typically < 100ms to first byte) since it's a Vercel-to-Vercel
 * internal request.
 *
 * Returns the Response object so the caller can pipe body + headers.
 */
export async function streamExportFile(blobUrl: string): Promise<Response> {
  const res = await fetch(blobUrl);
  if (!res.ok) {
    throw new Error(`Blob fetch failed: HTTP ${res.status} for ${blobUrl}`);
  }
  return res;
}

/**
 * Check if a blob still exists and get its metadata.
 * Returns null if the blob has been deleted (e.g., after retention expiry).
 */
export async function getBlobMetadata(
  blobUrl: string,
): Promise<{ size: number; contentType: string; uploadedAt: Date } | null> {
  try {
    const details = await head(blobUrl);
    if (!details) return null;
    return {
      size: details.size,
      contentType: details.contentType || 'application/octet-stream',
      uploadedAt: details.uploadedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Delete a blob from Vercel Blob.
 * Called during cancellation and during retention cleanup.
 */
export async function deleteExportFile(blobUrl: string): Promise<void> {
  if (!blobUrl) return;
  try {
    await del(blobUrl);
  } catch (err: any) {
    // Don't throw — deletion failure shouldn't block the calling flow.
    // The blob will be orphaned but Vercel Blob's own lifecycle will catch it.
    console.warn(`[export-storage] Failed to delete blob ${blobUrl}:`, err?.message);
  }
}
