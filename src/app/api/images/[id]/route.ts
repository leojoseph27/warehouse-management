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
