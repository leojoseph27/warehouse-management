import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/products/check-duplicate
 *
 * Checks for duplicate products by: ndNumber, barcode, productId, sku
 * Each check is independent and returns the first match (excluding the given ID).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ndNumber = searchParams.get('ndNumber') || '';
    const barcode = searchParams.get('barcode') || '';
    const productId = searchParams.get('productId') || '';
    const sku = searchParams.get('sku') || '';
    const excludeId = searchParams.get('excludeId') || '';

    const duplicates: Record<string, any> = {};

    if (ndNumber) {
      const where: any = { ndNumber };
      if (excludeId) where.id = { not: excludeId };

      const row = await db.product.findFirst({
        where,
        select: { id: true, nameEn: true, ndNumber: true },
      });

      if (row) {
        duplicates.ndNumber = {
          id: row.id,
          nameEn: row.nameEn,
          ndNumber: row.ndNumber,
        };
      }
    }

    if (barcode) {
      const where: any = { barcode };
      if (excludeId) where.id = { not: excludeId };

      const row = await db.product.findFirst({
        where,
        select: { id: true, nameEn: true, barcode: true },
      });

      if (row) {
        duplicates.barcode = {
          id: row.id,
          nameEn: row.nameEn,
          barcode: row.barcode,
        };
      }
    }

    if (productId) {
      const where: any = { productId };
      if (excludeId) where.id = { not: excludeId };

      const row = await db.product.findFirst({
        where,
        select: { id: true, nameEn: true, productId: true },
      });

      if (row) {
        duplicates.productId = {
          id: row.id,
          nameEn: row.nameEn,
          productId: row.productId,
        };
      }
    }

    if (sku) {
      const where: any = { sku };
      if (excludeId) where.id = { not: excludeId };

      const row = await db.product.findFirst({
        where,
        select: { id: true, nameEn: true, sku: true },
      });

      if (row) {
        duplicates.sku = {
          id: row.id,
          nameEn: row.nameEn,
          sku: row.sku,
        };
      }
    }

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 });
  }
}
