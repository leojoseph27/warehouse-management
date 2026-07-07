/**
 * Google Drive Helper Library
 *
 * Handles all Google Drive operations for product image storage:
 *   - Upload files to Drive
 *   - Set public "anyone with link → viewer" permission
 *   - Delete files from Drive
 *   - Create/reuse per-ND-Number subfolders
 *
 * Credentials are read from environment variables (NEVER hardcoded, NEVER
 * committed). Required env vars:
 *   GOOGLE_PROJECT_ID      — GCP project ID
 *   GOOGLE_CLIENT_EMAIL    — service account email (...@...iam.gserviceaccount.com)
 *   GOOGLE_PRIVATE_KEY     — service account private key (PEM, with \n escapes)
 *   GOOGLE_DRIVE_FOLDER_ID — root Drive folder ID where images go
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
  projectId: string;
  clientEmail: string;
  privateKey: string;
  rootFolderId: string;
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

let _driveClient: drive_v3.Drive | null = null;
const _ndFolderCache = new Map<string, string>(); // ndNumber → folderId

/**
 * Read Google Drive config from environment variables.
 * Throws a clear error if any required var is missing.
 */
export function getDriveConfig(): DriveConfig {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!projectId || !clientEmail || !privateKeyRaw || !rootFolderId) {
    throw new Error(
      'Google Drive not configured. Missing env vars: ' +
      [
        !projectId && 'GOOGLE_PROJECT_ID',
        !clientEmail && 'GOOGLE_CLIENT_EMAIL',
        !privateKeyRaw && 'GOOGLE_PRIVATE_KEY',
        !rootFolderId && 'GOOGLE_DRIVE_FOLDER_ID',
      ].filter(Boolean).join(', ')
    );
  }

  // The private key env var usually has \n escapes that need to be converted
  // to actual newlines for the JWT auth to work.
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  return { projectId, clientEmail, privateKey, rootFolderId };
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
 * Uses JWT auth with the service account credentials.
 */
export function getDriveClient(): drive_v3.Drive {
  if (_driveClient) return _driveClient;

  const config = getDriveConfig();
  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  _driveClient = google.drive({ version: 'v3', auth });
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
  const drive = getDriveClient();
  const folderId = await createOrGetNdFolder(ndNumber);

  // Convert File to Buffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine the filename to use on Drive. Use the original filename if
  // present, otherwise generate one.
  const filename = file.name || `image-${Date.now()}.jpg`;
  const mimeType = file.type || 'image/jpeg';
  const fileSize = file.size;

  // Upload the file
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadRes: any = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: buffer,
    },
    fields: 'id, name, size, mimeType',
  });

  const fileId = uploadRes.data.id;
  if (!fileId) {
    throw new Error('Google Drive upload succeeded but no file ID returned');
  }

  // Set public permission: anyone with the link → viewer
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permErr) {
    // If permission setting fails, the file exists but isn't public.
    // Try to clean up the orphaned file, then rethrow.
    console.error(`[google-drive] Failed to set public permission for ${fileId}:`, permErr);
    try {
      await drive.files.delete({ fileId });
    } catch {}
    throw new Error('Failed to set public permission on uploaded file');
  }

  return {
    driveFileId: fileId,
    imageUrl: buildImageUrl(fileId),
    thumbnailUrl: buildThumbnailUrl(fileId),
    drivePageUrl: buildDrivePageUrl(fileId),
    filename,
    mimeType,
    fileSize,
  };
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadRes: any = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: buffer,
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
