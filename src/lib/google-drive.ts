/**
 * Google Drive Helper Library
 *
 * Handles all Google Drive operations for product image storage:
 *   - Upload files to Drive
 *   - Set public "anyone with link → viewer" permission
 *   - Delete files from Drive
 *   - Create/reuse per-ND-Number subfolders
 *
 * Authentication: OAuth 2.0 (NOT Service Account).
 * Service Accounts don't have storage quota on personal Gmail accounts —
 * they require Google Workspace or shared drives. OAuth 2.0 authenticates
 * as the real Gmail user (leojoseph861@gmail.com) who owns the Drive
 * folder and has storage quota.
 *
 * Credentials are read from environment variables (NEVER hardcoded, NEVER
 * committed). Required env vars:
 *   GOOGLE_CLIENT_ID        — OAuth 2.0 client ID
 *   GOOGLE_CLIENT_SECRET    — OAuth 2.0 client secret
 *   GOOGLE_REFRESH_TOKEN    — OAuth 2.0 refresh token (long-lived)
 *   GOOGLE_DRIVE_FOLDER_ID  — root Drive folder ID where images go
 *
 * Folder organization:
 *   Root folder (GOOGLE_DRIVE_FOLDER_ID)/
 *     ND-6601/
 *       primary.jpg
 *       image2.jpg
 *     ND-6602/
 *       primary.jpg
 *
 * The ND-Number subfolders are created on demand and cached in memory to
 * avoid repeated Drive API calls for the same product.
 */

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface DriveUploadResult {
  driveFileId: string;
  imageUrl: string;       // https://drive.google.com/uc?export=view&id={FILE_ID}
  thumbnailUrl: string;   // https://drive.google.com/thumbnail?id={FILE_ID}&sz=w1000
  drivePageUrl: string;   // https://drive.google.com/file/d/{FILE_ID}/view
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface DriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string;
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

let _driveClient: drive_v3.Drive | null = null;
const _ndFolderCache = new Map<string, string>(); // ndNumber → folderId

/**
 * Read Google Drive OAuth config from environment variables.
 * Throws a clear error if any required var is missing.
 */
export function getDriveConfig(): DriveConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientId || !clientSecret || !refreshToken || !rootFolderId) {
    throw new Error(
      'Google Drive not configured. Missing env vars: ' +
      [
        !clientId && 'GOOGLE_CLIENT_ID',
        !clientSecret && 'GOOGLE_CLIENT_SECRET',
        !refreshToken && 'GOOGLE_REFRESH_TOKEN',
        !rootFolderId && 'GOOGLE_DRIVE_FOLDER_ID',
      ].filter(Boolean).join(', ')
    );
  }

  return { clientId, clientSecret, refreshToken, rootFolderId };
}

/**
 * Check if Google Drive is configured (all env vars present).
 * Used by routes to decide whether to use Drive or fall back.
 */
export function isDriveConfigured(): boolean {
  try {
    getDriveConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get an authenticated Google Drive client (singleton).
 * Uses OAuth 2.0 with a refresh token — authenticates as the real Gmail
 * user (leojoseph861@gmail.com) who owns the Drive folder and has storage
 * quota. The googleapis library automatically refreshes the access token
 * using the refresh token when the current access token expires.
 */
export function getDriveClient(): drive_v3.Drive {
  if (_driveClient) return _driveClient;

  const config = getDriveConfig();

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken,
  });

  _driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  return _driveClient;
}

// ─────────────────────────────────────────────────────────────
// URL Builders
// ─────────────────────────────────────────────────────────────

/** Build the preview/view URL for a Drive file */
export function buildImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/** Build the thumbnail URL for a Drive file (1000px wide) */
export function buildThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

/** Build the Drive page URL for a Drive file */
export function buildDrivePageUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// ─────────────────────────────────────────────────────────────
// Folder Management
// ─────────────────────────────────────────────────────────────

/**
 * Create or reuse a subfolder for a given product.
 *
 * Folder naming priority:
 *   1. ND Number (preferred) — e.g. "ND-6601", "ND-36029-18"
 *   2. Product ID (fallback) — e.g. "102000000126"
 *
 * Folder structure:
 *   {rootFolderId}/ND-6601/
 *   {rootFolderId}/102000000126/   (when no ND Number)
 *
 * If the folder already exists, returns its ID (cached in memory for the
 * lifetime of the process to avoid repeated list calls).
 *
 * If both ndNumber and productId are null/empty, returns the root folder ID
 * (no subfolder) — but this should never happen in practice.
 */
export async function createOrGetNdFolder(
  ndNumber: string | null | undefined,
  productId?: string | null
): Promise<string> {
  const config = getDriveConfig();

  // Determine the folder name: ND Number preferred, Product ID fallback
  const cleanNd = ndNumber?.trim();
  const cleanProductId = productId?.trim();
  const folderName = cleanNd || cleanProductId || null;

  // No folder name available → use root folder (should not happen in practice)
  if (!folderName) {
    console.log('[google-drive] No ND Number or Product ID — uploading to root folder');
    return config.rootFolderId;
  }

  console.log('[google-drive] Product folder lookup', {
    businessProductId: cleanProductId || '(none)',
    ndNumber: cleanNd || '(none)',
    chosenFolderName: folderName,
  });

  // Check cache first
  if (_ndFolderCache.has(folderName)) {
    const cachedId = _ndFolderCache.get(folderName)!;
    console.log('[google-drive] Folder cache hit', { chosenFolderName: folderName, folderId: cachedId });
    return cachedId;
  }

  const drive = getDriveClient();

  // Search for existing folder with this name inside the root folder only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRes: any = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${config.rootFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    const folderId = listRes.data.files[0].id!;
    _ndFolderCache.set(folderName, folderId);
    console.log('[google-drive] Found existing folder', { chosenFolderName: folderName, folderId });
    return folderId;
  }

  // Folder doesn't exist — create it inside the root folder
  console.log('[google-drive] Folder not found, creating', { chosenFolderName: folderName });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createRes: any = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [config.rootFolderId],
    },
    fields: 'id',
  });

  const newFolderId = createRes.data.id!;
  _ndFolderCache.set(folderName, newFolderId);
  console.log('[google-drive] Created new folder', { chosenFolderName: folderName, folderId: newFolderId });
  return newFolderId;
}

// ─────────────────────────────────────────────────────────────
// File Operations
// ─────────────────────────────────────────────────────────────

/**
 * Upload a file to Google Drive, set public permission, and return metadata.
 *
 * @param file      The file to upload (from FormData)
 * @param ndNumber  ND Number for folder organization (preferred folder name)
 * @param productId Product ID for folder organization (fallback folder name)
 * @returns         DriveUploadResult with file ID and URLs
 */
export async function uploadToDrive(
  file: File,
  ndNumber: string | null | undefined,
  productId?: string | null
): Promise<DriveUploadResult> {
  // Determine the folder name for logging: ND Number preferred, business
  // Product ID fallback. NEVER use the Prisma CUID (product.id).
  const cleanNd = ndNumber?.trim() || null;
  const cleanBusinessProductId = productId?.trim() || null;
  const chosenFolderName = cleanNd || cleanBusinessProductId || '(none)';

  console.log('[google-drive] uploadToDrive START', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    ndNumber: cleanNd || '(none)',
    businessProductId: cleanBusinessProductId || '(none)',
    chosenFolderName,
  });

  // ── Step A: Get Drive client (auth) ──
  console.log('[google-drive] step A: getting authenticated Drive client');
  let drive;
  try {
    drive = getDriveClient();
    console.log('[google-drive] ✓ step A: Drive client created');
  } catch (err) {
    console.error('[google-drive] ❌ step A FAILED (getDriveClient):', err);
    throw err;
  }

  // ── Step B: Create or get ND-Number folder ──
  console.log('[google-drive] step B: creating/getting ND folder', { ndNumber });
  let folderId: string;
  try {
    folderId = await createOrGetNdFolder(ndNumber, productId);
    console.log('[google-drive] ✓ step B: folder resolved', { folderId });
  } catch (err) {
    console.error('[google-drive] ❌ step B FAILED (createOrGetNdFolder):', {
      message: (err as any)?.message,
      code: (err as any)?.code,
      status: (err as any)?.status,
      errors: (err as any)?.errors,
      stack: (err as any)?.stack,
    });
    throw err;
  }

  // ── Step C: Convert File to Buffer ──
  console.log('[google-drive] step C: converting File to Buffer');
  let buffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    console.log('[google-drive] ✓ step C: buffer created', { bufferSize: buffer.length });
  } catch (err) {
    console.error('[google-drive] ❌ step C FAILED (arrayBuffer):', err);
    throw err;
  }

  const filename = file.name || `image-${Date.now()}.jpg`;
  const mimeType = file.type || 'image/jpeg';
  const fileSize = file.size;

  // ── Step D: Upload file to Drive ──
  console.log('[google-drive] step D: uploading file to Drive', { filename, mimeType, folderId });
  let fileId: string;
  try {
    // googleapis expects media.body to be a Readable stream (it calls
    // .pipe() on it). A Buffer doesn't have .pipe(), so we must convert.
    const stream = Readable.from(buffer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadRes: any = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, size, mimeType',
    });
    console.log('[google-drive] ✓ step D: Drive API response', {
      status: uploadRes?.status,
      statusText: uploadRes?.statusText,
      hasData: !!uploadRes?.data,
      dataId: uploadRes?.data?.id,
      dataName: uploadRes?.data?.name,
    });
    fileId = uploadRes.data.id;
    if (!fileId) {
      throw new Error(`Google Drive upload returned no file ID. Response: ${JSON.stringify(uploadRes?.data)}`);
    }
  } catch (err) {
    console.error('[google-drive] ❌ step D FAILED (drive.files.create):', {
      message: (err as any)?.message,
      code: (err as any)?.code,
      status: (err as any)?.status,
      errors: (err as any)?.errors,
      response: (err as any)?.response?.data,
      stack: (err as any)?.stack,
    });
    throw err;
  }

  // ── Step E: Set public permission ──
  console.log('[google-drive] step E: setting public permission (anyone:reader)', { fileId });
  try {
    const permRes = await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    console.log('[google-drive] ✓ step E: permission set', {
      status: permRes?.status,
      permissionId: permRes?.data?.id,
    });
  } catch (permErr) {
    console.error('[google-drive] ❌ step E FAILED (permissions.create):', {
      message: (permErr as any)?.message,
      code: (permErr as any)?.code,
      status: (permErr as any)?.status,
      errors: (permErr as any)?.errors,
      stack: (permErr as any)?.stack,
    });
    // Clean up the orphaned file
    try {
      await drive.files.delete({ fileId });
      console.log('[google-drive] cleaned up orphaned file', { fileId });
    } catch (delErr) {
      console.error('[google-drive] failed to clean up orphaned file', { fileId, error: (delErr as any)?.message });
    }
    throw new Error(`Failed to set public permission on uploaded file: ${(permErr as any)?.message}`);
  }

  const result: DriveUploadResult = {
    driveFileId: fileId,
    imageUrl: buildImageUrl(fileId),
    thumbnailUrl: buildThumbnailUrl(fileId),
    drivePageUrl: buildDrivePageUrl(fileId),
    filename,
    mimeType,
    fileSize,
  };
  console.log('[google-drive] uploadToDrive SUCCESS', {
    businessProductId: cleanBusinessProductId || '(none)',
    ndNumber: cleanNd || '(none)',
    chosenFolderName,
    googleFolderId: folderId,
    driveFileId: fileId,
  });
  return result;
}

/**
 * Upload a Buffer (used by the migration tool for base64 images).
 */
export async function uploadBufferToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  ndNumber: string | null | undefined,
  productId?: string | null
): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  const folderId = await createOrGetNdFolder(ndNumber, productId);

  // googleapis expects media.body to be a Readable stream (it calls .pipe()
  // on it). Convert the Buffer to a stream.
  const stream = Readable.from(buffer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadRes: any = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, size, mimeType',
  });

  const fileId = uploadRes.data.id;
  if (!fileId) {
    throw new Error('Google Drive upload succeeded but no file ID returned');
  }

  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (permErr) {
    console.error(`[google-drive] Failed to set public permission for ${fileId}:`, permErr);
    try { await drive.files.delete({ fileId }); } catch {}
    throw new Error('Failed to set public permission on uploaded file');
  }

  return {
    driveFileId: fileId,
    imageUrl: buildImageUrl(fileId),
    thumbnailUrl: buildThumbnailUrl(fileId),
    drivePageUrl: buildDrivePageUrl(fileId),
    filename,
    mimeType,
    fileSize: buffer.length,
  };
}

/**
 * Delete a file from Google Drive.
 * Silently succeeds if the file doesn't exist (already deleted).
 */
export async function deleteFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  try {
    await drive.files.delete({ fileId });
  } catch (err: any) {
    // If the file doesn't exist (404), treat as success — it's already gone.
    // Other errors should bubble up.
    if (err?.code !== 404 && err?.status !== 404) {
      throw err;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────

/**
 * Verify that the Drive client can authenticate and access the root folder.
 * Returns { ok, folderId, folderName } or throws.
 */
export async function verifyDriveAccess(): Promise<{ ok: boolean; folderId: string; folderName: string }> {
  const config = getDriveConfig();
  const drive = getDriveClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = await drive.files.get({
    fileId: config.rootFolderId,
    fields: 'id, name',
  });

  return {
    ok: true,
    folderId: res.data.id,
    folderName: res.data.name,
  };
}

/**
 * Move a file to a specific folder in Google Drive.
 * Uses the Drive API's addParents/removeParents parameters.
 *
 * @param fileId    The Drive file ID to move
 * @param folderId  The destination folder ID
 */
export async function moveFileToFolder(fileId: string, folderId: string): Promise<void> {
  const drive = getDriveClient();

  // Get current parents of the file
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileRes: any = await drive.files.get({
    fileId,
    fields: 'parents',
  });

  const previousParents = (fileRes.data.parents || []).join(',');

  // Move the file: add new parent, remove old parents
  await drive.files.update({
    fileId,
    addParents: folderId,
    removeParents: previousParents || undefined,
    fields: 'id, parents',
  });
}
