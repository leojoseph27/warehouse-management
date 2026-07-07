import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  uploadBufferToDrive,
  isDriveConfigured,
} from '@/lib/google-drive';

export const maxDuration = 300; // Migration can take a while for many images
export const runtime = 'nodejs';

/**
 * POST /api/images/migrate-base64
 *
 * One-time migration utility: scans all ProductImage records for base64
 * data URLs in imageUrl, uploads each to Google Drive, and updates the DB
 * record with the Drive file ID + URLs (removing the base64).
 *
 * Request body (optional JSON):
 *   { "dryRun": true }  — if true, only report what would be migrated
 *   { "limit": 10 }     — limit number of images to process (for testing)
 *
 * Returns a migration report:
 *   {
 *     totalScanned: number,
 *     imagesMigrated: number,
 *     imagesSkipped: number,
 *     failures: number,
 *     failuresDetail: [{ imageId, error }],
 *     duration: "Xs"
 *   }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!isDriveConfigured()) {
      return NextResponse.json(
        {
          error: 'Google Drive is not configured. Set GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID environment variables before running migration.',
        },
        { status: 500 }
      );
    }

    let dryRun = false;
    let limit: number | undefined;
    try {
      const body = await request.json();
      dryRun = body.dryRun === true;
      if (typeof body.limit === 'number' && body.limit > 0) {
        limit = body.limit;
      }
    } catch {
      // No body or invalid JSON — proceed with defaults
    }

    // Find all images whose imageUrl starts with "data:" (base64)
    const where = { imageUrl: { startsWith: 'data:' } };
    const totalBase64Count = await db.productImage.count({ where });

    if (totalBase64Count === 0) {
      return NextResponse.json({
        totalScanned: 0,
        imagesMigrated: 0,
        imagesSkipped: 0,
        failures: 0,
        failuresDetail: [],
        duration: '0s',
        message: 'No base64 images found to migrate. All images are already using Google Drive URLs.',
      });
    }

    // Fetch all base64 images (with their product's ndNumber for folder org)
    const images = await db.productImage.findMany({
      where,
      include: { product: { select: { ndNumber: true } } },
      orderBy: { createdAt: 'asc' },
      ...(limit ? { take: limit } : {}),
    });

    let imagesMigrated = 0;
    let imagesSkipped = 0;
    let failures = 0;
    const failuresDetail: { imageId: string; error: string }[] = [];

    for (const image of images) {
      try {
        const dataUrl = image.imageUrl;

        // Parse the data URL: data:image/png;base64,iVBOR...
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          imagesSkipped++;
          continue;
        }

        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate a filename if none exists
        const ext = mimeType.split('/')[1] || 'jpg';
        const filename = image.filename || `image-${image.id}.${ext}`;

        if (dryRun) {
          imagesMigrated++;
          continue;
        }

        // Upload to Drive
        const driveResult = await uploadBufferToDrive(
          buffer,
          filename,
          mimeType,
          image.product.ndNumber
        );

        // Update the DB record with Drive metadata (replaces base64)
        await db.productImage.update({
          where: { id: image.id },
          data: {
            imageUrl: driveResult.imageUrl,
            driveFileId: driveResult.driveFileId,
            thumbnailUrl: driveResult.thumbnailUrl,
            filename: driveResult.filename,
            mimeType: driveResult.mimeType,
            fileSize: driveResult.fileSize,
          },
        });

        imagesMigrated++;
      } catch (err: any) {
        failures++;
        failuresDetail.push({
          imageId: image.id,
          error: err?.message || 'Unknown error',
        });
        console.error(`[migrate] Failed for image ${image.id}:`, err?.message);
      }
    }

    const durationMs = Date.now() - startTime;
    const duration = `${(durationMs / 1000).toFixed(1)}s`;

    return NextResponse.json({
      totalScanned: images.length,
      imagesMigrated,
      imagesSkipped,
      failures,
      failuresDetail: failuresDetail.slice(0, 50),
      duration,
      dryRun,
      message: dryRun
        ? `Dry run complete. ${imagesMigrated} images would be migrated.`
        : `Migration complete. ${imagesMigrated} migrated, ${failures} failed.`,
    });
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('  /api/images/migrate-base64 — FAILED');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`  Error message: ${error?.message || 'Unknown error'}`);
    if (error?.stack) {
      error.stack.split('\n').forEach((line: string) => console.error(`    ${line}`));
    }
    console.error('═══════════════════════════════════════════════════════════');
    return NextResponse.json(
      { error: 'Migration failed', details: error?.message },
      { status: 500 }
    );
  }
}
