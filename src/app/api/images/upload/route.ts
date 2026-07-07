import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Image upload converts files to base64 data URLs — large images can take a
// few seconds. Request max duration for Vercel.
export const maxDuration = 60;
export const runtime = 'nodejs';

/**
 * POST /api/images/upload
 * Uploads an image for a product.
 * Stores the image as a base64 data URL in the database.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: 'No product ID provided' }, { status: 400 });
    }

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Convert file to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const imageUrl = `data:${mimeType};base64,${base64}`;

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

    const image = await db.productImage.create({
      data: {
        productId,
        imageUrl,
        displayOrder: nextOrder,
        isPrimary: isPrimary || nextOrder === 0,
      },
    });

    return NextResponse.json({
      id: image.id,
      productId: image.productId,
      imageUrl: image.imageUrl,
      displayOrder: image.displayOrder,
      isPrimary: image.isPrimary,
      createdAt: image.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
