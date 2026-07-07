import { NextResponse } from 'next/server';
import { isDriveConfigured, verifyDriveAccess } from '@/lib/google-drive';

export const runtime = 'nodejs';

/**
 * GET /api/images/drive-status
 *
 * Returns the Google Drive configuration status and verifies that the
 * service account can access the root folder.
 *
 * Response:
 *   200 { configured: true, accessible: true, folderId, folderName }
 *   200 { configured: true, accessible: false, error: "..." }
 *   200 { configured: false, missing: ["GOOGLE_PROJECT_ID", ...] }
 */
export async function GET() {
  if (!isDriveConfigured()) {
    const missing = [
      !process.env.GOOGLE_PROJECT_ID && 'GOOGLE_PROJECT_ID',
      !process.env.GOOGLE_CLIENT_EMAIL && 'GOOGLE_CLIENT_EMAIL',
      !process.env.GOOGLE_PRIVATE_KEY && 'GOOGLE_PRIVATE_KEY',
      !process.env.GOOGLE_DRIVE_FOLDER_ID && 'GOOGLE_DRIVE_FOLDER_ID',
    ].filter(Boolean);
    return NextResponse.json({ configured: false, missing });
  }

  try {
    const result = await verifyDriveAccess();
    return NextResponse.json({
      configured: true,
      accessible: true,
      folderId: result.folderId,
      folderName: result.folderName,
    });
  } catch (err: any) {
    return NextResponse.json({
      configured: true,
      accessible: false,
      error: err?.message || 'Failed to access Google Drive',
    });
  }
}
