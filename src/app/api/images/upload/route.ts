import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  uploadToDrive,
  isDriveConfigured,
} from '@/lib/google-drive';

// Image upload converts files and uploads to Google Drive.
// Drive operations can take a few seconds (upload + permission).
export const maxDuration = 60;
export const runtime = 'nodejs';

/**
 * POST /api/images/upload
 * Uploads an image for a product to Google Drive.
 *
 * Flow:
 *   1. Receive file + productId via FormData
 *   2. Verify product exists (and fetch ndNumber for folder organization)
 *   3. Upload to Google Drive → get driveFileId + URLs
 *   4. Set public permission (anyone with link → viewer)
 *   5. Store metadata in PostgreSQL (NO base64 — only driveFileId + URLs)
 *   6. Return the new image object
 *
 * If Google Drive is not configured (missing env vars), returns 500 with a
 * clear error message.
 */
export async function POST(request: NextRequest) {
  try {
    // Check Drive configuration first — fail fast with a clear message
    if (!isDriveConfigured()) {
      return NextResponse.json(
        {
          error: 'Google Drive is not configured. Set GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID environment variables.',
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!productId) {
      return NextResponse.json({ error: 'No product ID provided' }, { status: 400 });
    }

    // Verify product exists and get ndNumber for folder organization
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, ndNumber: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Upload to Google Drive (creates/reuses ND-Number subfolder automatically)
    const driveResult = await uploadToDrive(file, product.ndNumber);

    // Get current max display order for this product
    const existingImages = await db.productImage.findMany({
      where: { productId },
      orderBy: { displayOrder: 'desc' },
      take: 1,
    });
    const nextOrder = existingImages.length > 0 ? existingImages[0].displayOrder + 1 : 0;

    // If this is primary, unset other primaries
    if (isPrimary) {
      await db.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Store metadata in database (NO base64 — only Drive file ID + URLs)
    const image = await db.productImage.create({
      data: {
        productId,
        imageUrl: driveResult.imageUrl,
        driveFileId: driveResult.driveFileId,
        thumbnailUrl: driveResult.thumbnailUrl,
        filename: driveResult.filename,
        mimeType: driveResult.mimeType,
        fileSize: driveResult.fileSize,
        displayOrder: nextOrder,
        isPrimary: isPrimary || nextOrder === 0,
      },
    });

    return NextResponse.json(
      {
        id: image.id,
        productId: image.productId,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        driveFileId: image.driveFileId,
        filename: image.filename,
        mimeType: image.mimeType,
        fileSize: image.fileSize,
        displayOrder: image.displayOrder,
        isPrimary: image.isPrimary,
        createdAt: image.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('  /api/images/upload — FAILED');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`  Error message: ${error?.message || 'Unknown error'}`);
    if (error?.stack) {
      error.stack.split('\n').forEach((line: string) => console.error(`    ${line}`));
    }
    console.error('═══════════════════════════════════════════════════════════');
    return NextResponse.json(
      { error: 'Failed to upload image', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
