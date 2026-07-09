import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  createOrGetNdFolder,
  moveFileToFolder,
  isDriveConfigured,
} from '@/lib/google-drive';

export const maxDuration = 300; // Can take a while for many products
export const runtime = 'nodejs';

/**
 * POST /api/images/check-folders
 *
 * Scans all products with images and ensures every image is in the correct
 * Google Drive folder (named after the product's ND Number or Product ID).
 *
 * For each product:
 *   1. Determine the correct folder name (ND Number preferred, Product ID fallback)
 *   2. Find or create the folder via createOrGetNdFolder
 *   3. For each image with a driveFileId, check if it's already in the folder
 *   4. If not, move it there via moveFileToFolder
 *
 * Returns a report:
 *   {
 *     totalProducts: number,
 *     productsChecked: number,
 *     foldersCreated: number,
 *     filesMoved: number,
 *     filesSkipped: number,
 *     failures: number,
 *     details: [{ productIdentifier, folderName, imagesMoved, errors }],
 *     duration: "Xs"
 *   }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!isDriveConfigured()) {
      return NextResponse.json(
        { error: 'Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, and GOOGLE_DRIVE_FOLDER_ID environment variables.' },
        { status: 500 }
      );
    }

    // Optional limit for testing
    let limit: number | undefined;
    try {
      const body = await request.json();
      if (typeof body.limit === 'number' && body.limit > 0) {
        limit = body.limit;
      }
    } catch {
      // No body — process all
    }

    // Find all products that have images with driveFileId
    const products = await db.product.findMany({
      where: {
        images: {
          some: { driveFileId: { not: null } },
        },
      },
      select: {
        id: true,
        ndNumber: true,
        productId: true,
        nameEn: true,
        sourceRow: true,
        images: {
          where: { driveFileId: { not: null } },
          select: { id: true, driveFileId: true, filename: true },
        },
      },
      orderBy: { sourceRow: 'asc' },
      ...(limit ? { take: limit } : {}),
    });

    let foldersCreated = 0;
    let filesMoved = 0;
    let filesSkipped = 0;
    let failures = 0;
    const details: any[] = [];

    for (const product of products) {
      const productIdentifier = product.ndNumber || product.productId || `sr-${product.sourceRow}`;

      try {
        // Determine the correct folder name
        const cleanNd = product.ndNumber?.trim() || null;
        const cleanProductId = product.productId?.trim() || null;
        const folderName = cleanNd || cleanProductId || null;

        if (!folderName) {
          console.log(`[check-folders] Skipping product ${product.id} — no ND Number or Product ID`);
          failures++;
          details.push({
            productIdentifier,
            error: 'No ND Number or Product ID — cannot determine folder name',
          });
          continue;
        }

        // Get or create the correct folder
        console.log(`[check-folders] Processing ${productIdentifier} (${product.images.length} images)`);
        const folderId = await createOrGetNdFolder(product.ndNumber, product.productId);

        // For each image, move it to the correct folder
        let movedCount = 0;
        let skippedCount = 0;
        const imageErrors: string[] = [];

        for (const image of product.images) {
          if (!image.driveFileId) {
            skippedCount++;
            continue;
          }

          try {
            console.log(`[check-folders] Moving file ${image.driveFileId} → folder ${folderName}`);
            await moveFileToFolder(image.driveFileId, folderId);
            movedCount++;
          } catch (moveErr: any) {
            console.error(`[check-folders] Failed to move ${image.driveFileId}:`, moveErr?.message);
            imageErrors.push(`${image.filename || image.id}: ${moveErr?.message || 'Unknown error'}`);
          }
        }

        filesMoved += movedCount;
        filesSkipped += skippedCount;

        details.push({
          productIdentifier,
          folderName,
          folderId,
          imagesTotal: product.images.length,
          imagesMoved: movedCount,
          imagesSkipped: skippedCount,
          errors: imageErrors.length > 0 ? imageErrors : undefined,
        });

        if (imageErrors.length > 0) {
          failures += imageErrors.length;
        }
      } catch (err: any) {
        console.error(`[check-folders] Failed for ${productIdentifier}:`, err?.message);
        failures++;
        details.push({
          productIdentifier,
          error: err?.message || 'Unknown error',
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const duration = `${(durationMs / 1000).toFixed(1)}s`;

    return NextResponse.json({
      totalProducts: products.length,
      productsChecked: products.length,
      foldersCreated,
      filesMoved,
      filesSkipped,
      failures,
      details: details.slice(0, 100), // Cap to avoid huge responses
      duration,
      message: `Checked ${products.length} products. Moved ${filesMoved} files, ${failures} failures.`,
    });
  } catch (error: any) {
    console.error('[check-folders] FATAL:', error);
    return NextResponse.json(
      { error: 'Check folders failed', details: error?.message },
      { status: 500 }
    );
  }
}
