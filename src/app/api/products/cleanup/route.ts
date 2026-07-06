import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * DELETE /api/products/cleanup
 *
 * Query param:
 *   ?mode=all  — delete ALL products and product_images
 *   (default)  — delete only ghost products (no identifying data)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // ── Full wipe mode ──
    if (mode === 'all') {
      // Delete all images first (FK constraint)
      const imagesDeleted = await db.productImage.deleteMany({});
      // Delete all products
      const productsDeleted = await db.product.deleteMany({});

      console.log(`[CLEANUP ALL] Done: ${productsDeleted.count} products, ${imagesDeleted.count} images`);

      return NextResponse.json({
        message: `Deleted all data: ${productsDeleted.count} products, ${imagesDeleted.count} images`,
        productsDeleted: productsDeleted.count,
        imagesDeleted: imagesDeleted.count,
      });
    }

    // ── Ghost-only mode (default) ──
    // A ghost product has no identifying data in the new schema
    const ghostProducts = await db.product.findMany({
      where: {
        nameEn: null,
        nameAr: null,
        ndNumber: null,
        barcode: null,
        productId: null,
        sku: null,
        sourceRow: null,
      },
      select: { id: true },
    });

    if (ghostProducts.length === 0) {
      return NextResponse.json({ message: 'No ghost products found to clean up', deleted: 0 });
    }

    const ghostIds = ghostProducts.map(p => p.id);
    // Images cascade delete
    const { count } = await db.product.deleteMany({
      where: { id: { in: ghostIds } },
    });

    return NextResponse.json({
      message: `Cleaned up ${count} ghost products`,
      deleted: count,
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({ error: 'Failed to clean up' }, { status: 500 });
  }
}
