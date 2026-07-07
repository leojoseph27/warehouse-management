import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  uploadToDrive,
  deleteFromDrive,
  isDriveConfigured,
} from '@/lib/google-drive';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const image = await db.productImage.findUnique({
      where: { id },
      include: { product: { select: { id: true } } },
    });
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete the Google Drive file (if it has a driveFileId)
    // Delete BEFORE the DB record so we don't get orphaned Drive files if the
    // DB delete fails. If Drive delete fails, we keep the DB record so the
    // user can retry.
    if (image.driveFileId) {
      try {
        await deleteFromDrive(image.driveFileId);
      } catch (driveErr: any) {
        console.error(`[images/delete] Failed to delete Drive file ${image.driveFileId}:`, driveErr?.message);
        // Continue with DB delete anyway — the user wants the image gone.
        // The Drive file may become orphaned, but that's better than leaving
        // a broken DB record. We log it for manual cleanup.
      }
    }

    // Delete the DB record
    await db.productImage.delete({ where: { id } });

    // If the deleted image was primary, auto-assign a new primary
    // (the first remaining image by displayOrder)
    if (image.isPrimary) {
      const nextPrimary = await db.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { displayOrder: 'asc' },
      });
      if (nextPrimary) {
        await db.productImage.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image', details: error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // If setting as primary, unset other primaries for the same product
    if (body.isPrimary) {
      const image = await db.productImage.findUnique({ where: { id }, select: { productId: true } });
      if (image) {
        await db.productImage.updateMany({
          where: { productId: image.productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
    }

    const updateData: Record<string, any> = {};
    if (body.isPrimary !== undefined) updateData.isPrimary = body.isPrimary;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;

    const updatedImage = await db.productImage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedImage.id,
      productId: updatedImage.productId,
      imageUrl: updatedImage.imageUrl,
      thumbnailUrl: updatedImage.thumbnailUrl,
      driveFileId: updatedImage.driveFileId,
      displayOrder: updatedImage.displayOrder,
      isPrimary: updatedImage.isPrimary,
      createdAt: updatedImage.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { error: 'Failed to update image', details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/images/[id] — Replace an existing image with a new file.
 *
 * Flow:
 *   1. Find the existing image record
 *   2. Upload the new file to Google Drive (preserves isPrimary + displayOrder)
 *   3. Delete the old Google Drive file
 *   4. Update the DB record with new driveFileId + URLs + metadata
 *   5. Return the updated image object
 *
 * Preserves: isPrimary, displayOrder (these are NOT changed during replace)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDriveConfigured()) {
      return NextResponse.json(
        { error: 'Google Drive is not configured. Set GOOGLE_* environment variables.' },
        { status: 500 }
      );
    }

    const existing = await db.productImage.findUnique({
      where: { id },
      include: { product: { select: { ndNumber: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Step 1: Upload the new file to Drive (into the same product folder)
    const driveResult = await uploadToDrive(file, existing.product.ndNumber, existing.productId);

    // Step 2: Delete the OLD Drive file (now that the new one is safely uploaded)
    const oldDriveFileId = existing.driveFileId;
    if (oldDriveFileId) {
      try {
        await deleteFromDrive(oldDriveFileId);
      } catch (err: any) {
        // Don't fail the replace if old file cleanup fails — log for manual cleanup
        console.error(`[images/replace] Failed to delete old Drive file ${oldDriveFileId}:`, err?.message);
      }
    }

    // Step 3: Update the DB record (preserve isPrimary + displayOrder)
    const updated = await db.productImage.update({
      where: { id },
      data: {
        imageUrl: driveResult.imageUrl,
        driveFileId: driveResult.driveFileId,
        thumbnailUrl: driveResult.thumbnailUrl,
        filename: driveResult.filename,
        mimeType: driveResult.mimeType,
        fileSize: driveResult.fileSize,
        // isPrimary and displayOrder are NOT updated — preserved as-is
      },
    });

    return NextResponse.json({
      id: updated.id,
      productId: updated.productId,
      imageUrl: updated.imageUrl,
      thumbnailUrl: updated.thumbnailUrl,
      driveFileId: updated.driveFileId,
      filename: updated.filename,
      mimeType: updated.mimeType,
      fileSize: updated.fileSize,
      displayOrder: updated.displayOrder,
      isPrimary: updated.isPrimary,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('  /api/images/[id] PUT (replace) — FAILED');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`  Error message: ${error?.message || 'Unknown error'}`);
    if (error?.stack) {
      error.stack.split('\n').forEach((line: string) => console.error(`    ${line}`));
    }
    console.error('═══════════════════════════════════════════════════════════');
    return NextResponse.json(
      { error: 'Failed to replace image', details: error?.message },
      { status: 500 }
    );
  }
}
