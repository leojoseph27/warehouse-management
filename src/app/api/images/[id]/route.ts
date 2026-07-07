import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const image = await db.productImage.findUnique({ where: { id } });
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    await db.productImage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
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
      displayOrder: updatedImage.displayOrder,
      isPrimary: updatedImage.isPrimary,
      createdAt: updatedImage.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}

/**
 * PUT /api/images/[id] — Replace an existing image with a new file.
 *
 * Accepts multipart/form-data with:
 *   - file: the new image file
 *
 * Replaces the imageUrl (and preserves isPrimary + displayOrder) of the
 * existing image record. This allows "Replace" UX without delete-then-upload.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.productImage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert to base64 data URL (same storage strategy as upload route)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const newImageUrl = `data:${mimeType};base64,${base64}`;

    // Update in place — preserve isPrimary and displayOrder
    const updated = await db.productImage.update({
      where: { id },
      data: { imageUrl: newImageUrl },
    });

    return NextResponse.json({
      id: updated.id,
      productId: updated.productId,
      imageUrl: updated.imageUrl,
      displayOrder: updated.displayOrder,
      isPrimary: updated.isPrimary,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error replacing image:', error);
    return NextResponse.json({ error: 'Failed to replace image' }, { status: 500 });
  }
}
