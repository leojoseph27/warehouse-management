import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeProduct, applyAutoDerivations } from '@/lib/serialize-product';

/** All 52 product fields that can be accepted in PUT body */
const PRODUCT_FIELDS = [
  // Product Identity
  'sourceRow', 'productId', 'sku', 'ndNumber', 'barcode', 'legacyCode',
  'brand', 'brandAr', 'brandCode', 'model',
  // Classification
  'department', 'category', 'subcategory', 'sectionCode',
  'productFamily', 'productType',
  // Product Information
  'nameAr', 'nameEn', 'shortDescAr', 'shortDescEn',
  'longDescAr', 'longDescEn',
  // Attributes
  'color', 'colorAr', 'material', 'materialAr',
  'capacity', 'capacityUnit', 'weight', 'weightUnit',
  'length', 'width', 'height', 'diameter', 'dimensionUnit',
  // Logistics
  'countryOfOrigin', 'unit', 'minSalesMultiples',
  // Commercial
  'defaultPrice',
  // SEO
  'seoTitleEn', 'seoTitleAr', 'seoDescriptionEn', 'seoDescriptionAr', 'searchKeywords',
  // Internal
  'internalNotes', 'validationStatus', 'confidenceScore',
  'pieces', 'setCount', 'shape', 'finish', 'additionalInfo',
] as const;

/** Numeric fields that should be coerced to numbers or null */
const NUMERIC_FIELDS = new Set([
  'sourceRow', 'capacity', 'weight', 'length', 'width', 'height',
  'diameter', 'defaultPrice', 'confidenceScore', 'pieces', 'setCount',
]);

function coerceFieldValue(field: string, value: any): any {
  if (value === undefined) return null;
  if (value === null || value === '') return null;
  if (NUMERIC_FIELDS.has(field)) {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(serializeProduct(product));
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Extract only known product fields
    const rawData: Record<string, any> = {};
    for (const field of PRODUCT_FIELDS) {
      if (field in body) {
        rawData[field] = coerceFieldValue(field, body[field]);
      }
    }

    if (Object.keys(rawData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Apply auto-derivations
    const data = applyAutoDerivations(rawData);

    const product = await db.product.update({
      where: { id },
      data,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: true,
      },
    });

    return NextResponse.json(serializeProduct(product));
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check product exists
    const product = await db.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete product (cascades to images via FK)
    await db.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
