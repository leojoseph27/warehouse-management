import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function normalizeJsonField(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.length > 0 ? JSON.stringify(parsed) : null;
      } catch {}
    }
    const items = trimmed.split(/[,;|]/).map(v => v.trim()).filter(Boolean);
    return items.length > 0 ? JSON.stringify(items) : null;
  }
  return null;
}

function serializeJsonField(value: string | null): string | null {
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
      include: { images: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: product.id,
      sr: product.sr,
      englishDescription: product.englishDescription,
      arabicDescription: product.arabicDescription,
      ndNumber: product.ndNumber,
      barcode: product.barcode,
      colours: serializeJsonField(product.colours),
      length: product.length,
      width: product.width,
      height: product.height,
      made: product.made,
      materials: serializeJsonField(product.materials),
      additionalInfo: serializeJsonField(product.additionalInfo),
      price: product.price,
      pcs: product.pcs,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      images: product.images.map(img => ({
        id: img.id,
        productId: img.productId,
        imageUrl: img.imageUrl,
        displayOrder: img.displayOrder,
        isPrimary: img.isPrimary,
        createdAt: img.createdAt.toISOString(),
      })),
    });
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

    const updateData: Record<string, any> = {};

    const fieldMappings: Record<string, { dbKey: string; normalize?: (v: any) => any }> = {
      sr: { dbKey: 'sr' },
      englishDescription: { dbKey: 'englishDescription' },
      arabicDescription: { dbKey: 'arabicDescription' },
      ndNumber: { dbKey: 'ndNumber' },
      barcode: { dbKey: 'barcode' },
      colours: { dbKey: 'colours', normalize: normalizeJsonField },
      length: { dbKey: 'length' },
      width: { dbKey: 'width' },
      height: { dbKey: 'height' },
      made: { dbKey: 'made' },
      materials: { dbKey: 'materials', normalize: normalizeJsonField },
      additionalInfo: { dbKey: 'additionalInfo', normalize: normalizeJsonField },
      price: { dbKey: 'price' },
      pcs: { dbKey: 'pcs' },
    };

    for (const [bodyKey, mapping] of Object.entries(fieldMappings)) {
      if (bodyKey in body) {
        const rawValue = body[bodyKey];
        const value = mapping.normalize ? mapping.normalize(rawValue) : (rawValue ?? null);
        updateData[mapping.dbKey] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: { images: { orderBy: { displayOrder: 'asc' } } },
    });

    return NextResponse.json({
      id: product.id,
      sr: product.sr,
      englishDescription: product.englishDescription,
      arabicDescription: product.arabicDescription,
      ndNumber: product.ndNumber,
      barcode: product.barcode,
      colours: serializeJsonField(product.colours),
      length: product.length,
      width: product.width,
      height: product.height,
      made: product.made,
      materials: serializeJsonField(product.materials),
      additionalInfo: serializeJsonField(product.additionalInfo),
      price: product.price,
      pcs: product.pcs,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      images: product.images.map(img => ({
        id: img.id,
        productId: img.productId,
        imageUrl: img.imageUrl,
        displayOrder: img.displayOrder,
        isPrimary: img.isPrimary,
        createdAt: img.createdAt.toISOString(),
      })),
    });
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
