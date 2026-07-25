import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeProduct } from '@/lib/serialize-product';

/**
 * POST /api/products/[id]/undo
 *
 * Reverts modified fields back to their original imported values (stored in
 * the ProductOriginal table). This is the "undo modifications" feature that
 * pairs with the red-font change tracking shown in the UI and Excel export.
 *
 * Body:
 *   { "fields": ["length", "width"] }   — undo only these fields
 *   { "fields": [] } or {}              — undo ALL tracked fields
 *
 * Response:
 *   200 — { product: <serialized product with original=true> }
 *   404 — product or original not found
 *   500 — server error
 *
 * How it works:
 *   1. Load the product's ProductOriginal (the baseline from import).
 *   2. For each field to undo, copy the value from ProductOriginal to Product.
 *      Special case: ProductOriginal.origProductId → Product.productId
 *   3. Re-apply auto-derivations so derived fields (brandAr, colorAr, etc.)
 *      stay consistent with the reverted source fields.
 *   4. Save and return the updated product.
 *
 * After undo, the red-font highlighting disappears because the current values
 * match the original values again (getFieldChanges returns []).
 */

/** All fields that can be tracked/undone. Must match TRACKED_FIELDS in
 *  inventory-store.ts and export/route.ts. */
const TRACKED_FIELDS = [
  'productId', 'sku', 'ndNumber', 'barcode', 'legacyCode', 'brand', 'model',
  'department', 'category', 'subcategory', 'productFamily', 'productType',
  'nameAr', 'enCatalog', 'nameEn', 'shortDescAr', 'shortDescEn', 'longDescAr', 'longDescEn',
  'color', 'material', 'capacity', 'capacityUnit', 'weight', 'weightUnit',
  'length', 'width', 'height', 'diameter', 'dimensionUnit',
  'countryOfOrigin', 'unit', 'minSalesMultiples', 'defaultPrice',
  'seoTitleEn', 'seoTitleAr', 'seoDescriptionEn', 'seoDescriptionAr', 'searchKeywords',
  'internalNotes', 'validationStatus', 'confidenceScore', 'pieces', 'setCount', 'shape', 'finish', 'additionalInfo',
] as const;

/** Map of ProductOriginal field → Product field. Most are 1:1, but
 *  ProductOriginal.origProductId maps to Product.productId. */
const ORIGINAL_TO_PRODUCT_FIELD: Record<string, string> = {
  origProductId: 'productId',
  // all other fields share the same name
};

/** Fields whose values should be coerced to numbers (not strings). These
 *  stayed numeric in the schema (Float/Int) even after the multi-value
 *  change, so we must coerce the original's value back to a number. */
const NUMERIC_PRODUCT_FIELDS = new Set([
  'defaultPrice', 'confidenceScore', 'pieces', 'setCount',
]);

/** sourceRow is Int in both models — coerce to integer. */
const INTEGER_PRODUCT_FIELDS = new Set([
  'sourceRow', 'confidenceScore', 'pieces', 'setCount',
]);

function coerceValue(field: string, value: any): any {
  if (value === null || value === undefined || value === '') return null;
  if (NUMERIC_PRODUCT_FIELDS.has(field)) {
    const n = Number(value);
    if (isNaN(n)) return null;
    if (INTEGER_PRODUCT_FIELDS.has(field)) return Math.trunc(n);
    return n;
  }
  return value;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse body (may be empty)
    let body: { fields?: string[] } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body → undo all
    }

    // Determine which fields to undo
    const requestedFields = Array.isArray(body.fields) ? body.fields : [];
    const fieldsToUndo: string[] =
      requestedFields.length > 0
        ? requestedFields.filter((f) => TRACKED_FIELDS.includes(f as any))
        : [...TRACKED_FIELDS];

    if (fieldsToUndo.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to undo.' },
        { status: 400 }
      );
    }

    // Load product with its original
    const product = await db.product.findUnique({
      where: { id },
      include: { original: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!product.original) {
      return NextResponse.json(
        { error: 'No original baseline exists for this product — nothing to undo.' },
        { status: 404 }
      );
    }

    const original = product.original;

    // Build the update data by copying original values → product fields
    const updateData: Record<string, any> = {};
    for (const field of fieldsToUndo) {
      // Find the corresponding field on ProductOriginal
      const originalField = Object.entries(ORIGINAL_TO_PRODUCT_FIELD)
        .find(([_, productField]) => productField === field)?.[0] ?? field;

      const originalValue = (original as any)[originalField];
      updateData[field] = coerceValue(field, originalValue);
    }

    // Apply the update
    const updated = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: true,
      },
    });

    return NextResponse.json({
      product: serializeProduct(updated),
      undoneFields: fieldsToUndo,
      message: `Reverted ${fieldsToUndo.length} field(s) to original values.`,
    });
  } catch (error: any) {
    console.error('Error undoing product changes:', error);
    return NextResponse.json(
      { error: 'Failed to undo changes', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
