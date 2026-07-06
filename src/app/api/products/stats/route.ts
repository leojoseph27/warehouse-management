import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total Products
    const totalProducts = await db.product.count();

    // Added Today
    const productsAddedToday = await db.product.count({
      where: { createdAt: { gte: today } },
    });

    // Missing Images: products with no images
    const productsWithImages = await db.product.count({
      where: { images: { some: {} } },
    });
    const productsMissingImages = totalProducts - productsWithImages;

    // Missing Barcode
    const productsMissingBarcode = await db.product.count({
      where: { barcode: null },
    });

    // Missing Dimensions (any of length, width, height is null)
    const productsWithAllDims = await db.product.count({
      where: {
        length: { not: null },
        width: { not: null },
        height: { not: null },
      },
    });
    const productsMissingDimensions = totalProducts - productsWithAllDims;

    return NextResponse.json({
      totalProducts,
      productsAddedToday,
      productsMissingImages,
      productsMissingBarcode,
      productsMissingDimensions,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
