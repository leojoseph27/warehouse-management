import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/products/stats
 *
 * Returns catalog statistics including new 52-column quality checks.
 */
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

    // Missing Classification (department is null)
    const productsMissingClassification = await db.product.count({
      where: { department: null },
    });

    // Missing Name EN
    const productsMissingNameEn = await db.product.count({
      where: { nameEn: null },
    });

    // Missing Price (defaultPrice is null)
    const productsMissingPrice = await db.product.count({
      where: { defaultPrice: null },
    });

    return NextResponse.json({
      totalProducts,
      productsAddedToday,
      productsMissingImages,
      productsMissingBarcode,
      productsMissingDimensions,
      productsMissingClassification,
      productsMissingNameEn,
      productsMissingPrice,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
