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

function logStep(step: string, data?: any) {
  console.log(`[upload] ${step}`, data !== undefined ? data : '');
}

function logError(step: string, error: any) {
  console.error(`[upload] ❌ FAILED at: ${step}`);
  console.error(`[upload]   error.message: ${error?.message || 'N/A'}`);
  console.error(`[upload]   error.name: ${error?.name || 'N/A'}`);
  console.error(`[upload]   error.code: ${error?.code || 'N/A'}`);
  console.error(`[upload]   error.status: ${error?.status || 'N/A'}`);
  if (error?.errors) {
    console.error(`[upload]   error.errors: ${JSON.stringify(error.errors)}`);
  }
  if (error?.response?.data) {
    console.error(`[upload]   API response body: ${JSON.stringify(error.response.data)}`);
  }
  if (error?.stack) {
    console.error(`[upload]   stack trace:`);
    error.stack.split('\n').forEach((line: string) => console.error(`[upload]     ${line}`));
  }
}

export async function POST(request: NextRequest) {
  logStep('══════ POST /api/images/upload START ══════');
  logStep('step 1: checking Drive configuration');
  logStep('  isDriveConfigured()', isDriveConfigured());

  try {
    // ── STEP 1: Check Drive configuration ──
    if (!isDriveConfigured()) {
      logStep('❌ step 1 failed: Drive not configured');
      return NextResponse.json(
        { error: 'Google Drive is not configured. Set GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID environment variables.' },
        { status: 500 }
      );
    }
    logStep('✓ step 1 passed: Drive is configured');

    // ── STEP 2: Parse FormData ──
    logStep('step 2: parsing FormData');
    let file: File | null;
    let productId: string | null;
    let isPrimary: boolean;
    try {
      const formData = await request.formData();
      file = formData.get('file') as File | null;
      productId = formData.get('productId') as string | null;
      isPrimary = formData.get('isPrimary') === 'true';
      logStep('✓ step 2 passed', {
        hasFile: !!file,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        productId,
        isPrimary,
      });
    } catch (err) {
      logError('step 2 (parse FormData)', err);
      throw err;
    }

    if (!file) {
      logStep('❌ step 2 validation: no file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!productId) {
      logStep('❌ step 2 validation: no productId provided');
      return NextResponse.json({ error: 'No product ID provided' }, { status: 400 });
    }

    // ── STEP 3: Verify product exists in database ──
    logStep('step 3: querying database for product', { productId });
    let product: { id: string; ndNumber: string | null } | null;
    try {
      product = await db.product.findUnique({
        where: { id: productId },
        select: { id: true, ndNumber: true },
      });
      logStep('✓ step 3 passed', { productFound: !!product, ndNumber: product?.ndNumber });
    } catch (err) {
      logError('step 3 (Prisma findUnique product)', err);
      throw err;
    }

    if (!product) {
      logStep('❌ step 3: product not found');
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // ── STEP 4: Upload to Google Drive ──
    logStep('step 4: uploading to Google Drive', {
      fileName: file.name,
      fileSize: file.size,
      ndNumber: product.ndNumber,
    });
    let driveResult;
    try {
      driveResult = await uploadToDrive(file, product.ndNumber);
      logStep('✓ step 4 passed', {
        driveFileId: driveResult.driveFileId,
        imageUrl: driveResult.imageUrl?.slice(0, 80),
        thumbnailUrl: driveResult.thumbnailUrl?.slice(0, 80),
        filename: driveResult.filename,
        mimeType: driveResult.mimeType,
        fileSize: driveResult.fileSize,
      });
    } catch (err) {
      logError('step 4 (uploadToDrive)', err);
      throw err;
    }

    // ── STEP 5: Get current max display order ──
    logStep('step 5: querying existing images for display order');
    let existingImages;
    let nextOrder: number;
    try {
      existingImages = await db.productImage.findMany({
        where: { productId },
        orderBy: { displayOrder: 'desc' },
        take: 1,
      });
      nextOrder = existingImages.length > 0 ? existingImages[0].displayOrder + 1 : 0;
      logStep('✓ step 5 passed', { existingCount: existingImages.length, nextOrder });
    } catch (err) {
      logError('step 5 (Prisma findMany productImage)', err);
      throw err;
    }

    // ── STEP 6: Unset other primaries if this is primary ──
    if (isPrimary) {
      logStep('step 6: unsetting other primary images');
      try {
        const updateResult = await db.productImage.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        });
        logStep('✓ step 6 passed', { unsetCount: updateResult.count });
      } catch (err) {
        logError('step 6 (Prisma updateMany unset primaries)', err);
        throw err;
      }
    } else {
      logStep('step 6: skipped (not primary)');
    }

    // ── STEP 7: Insert image record in database ──
    logStep('step 7: inserting ProductImage record', {
      productId,
      driveFileId: driveResult.driveFileId,
      displayOrder: nextOrder,
      isPrimary: isPrimary || nextOrder === 0,
    });
    let image;
    try {
      image = await db.productImage.create({
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
      logStep('✓ step 7 passed', { imageId: image.id });
    } catch (err) {
      logError('step 7 (Prisma create productImage)', err);
      throw err;
    }

    // ── STEP 8: Return response ──
    logStep('step 8: building response');
    const response = {
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
    };
    logStep('══════ POST /api/images/upload SUCCESS ══════', { imageId: image.id });

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    logError('CATCH BLOCK (unhandled)', error);
    console.error('[upload] ══════ POST /api/images/upload FAILED ══════');
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: error?.message || 'Unknown error',
        step: error?.step || 'unknown',
      },
      { status: 500 }
    );
  }
}
