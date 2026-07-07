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
 * Create or reuse a subfolder for a given ND Number.
 *
 * Folder structure:
 *   {rootFolderId}/ND-6601/
 *
 * If the folder already exists, returns its ID (cached in memory for the
 * lifetime of the process to avoid repeated list calls).
 *
 * If ndNumber is null/empty, returns the root folder ID (no subfolder).
 */
export async function createOrGetNdFolder(ndNumber: string | null | undefined): Promise<string> {
  const config = getDriveConfig();

  // No ND number → use root folder
  if (!ndNumber || ndNumber.trim() === '') {
    return config.rootFolderId;
  }

  const cleanNd = ndNumber.trim();

  // Check cache first
  if (_ndFolderCache.has(cleanNd)) {
    return _ndFolderCache.get(cleanNd)!;
  }

  const drive = getDriveClient();

  // Search for existing folder with this name inside the root folder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRes: any = await drive.files.list({
    q: `name='${cleanNd}' and mimeType='application/vnd.google-apps.folder' and '${config.rootFolderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    const folderId = listRes.data.files[0].id!;
    _ndFolderCache.set(cleanNd, folderId);
    return folderId;
  }

  // Folder doesn't exist — create it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createRes: any = await drive.files.create({
    requestBody: {
      name: cleanNd,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [config.rootFolderId],
    },
    fields: 'id',
  });

  const newFolderId = createRes.data.id!;
  _ndFolderCache.set(cleanNd, newFolderId);
  return newFolderId;
}

// ─────────────────────────────────────────────────────────────
// File Operations
// ─────────────────────────────────────────────────────────────

/**
 * Upload a file to Google Drive, set public permission, and return metadata.
 *
 * @param file     The file to upload (from FormData)
 * @param ndNumber ND Number for folder organization (null = root folder)
 * @returns        DriveUploadResult with file ID and URLs
 */
export async function uploadToDrive(
  file: File,
  ndNumber: string | null | undefined
): Promise<DriveUploadResult> {
  console.log('[google-drive] uploadToDrive START', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    ndNumber,
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
    folderId = await createOrGetNdFolder(ndNumber);
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
  console.log('[google-drive] uploadToDrive SUCCESS', { driveFileId: fileId });
  return result;
}

/**
 * Upload a Buffer (used by the migration tool for base64 images).
 */
export async function uploadBufferToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  ndNumber: string | null | undefined
): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  const folderId = await createOrGetNdFolder(ndNumber);

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
