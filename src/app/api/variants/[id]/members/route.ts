import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/variants/[id]/members
 * Add a product to a variant group with optional variant-specific details
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { productId, color, colorAr, variantImage, variantNotes } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Check if variant group exists
    const variantGroup = await db.variantGroup.findUnique({
      where: { id },
    });

    if (!variantGroup) {
      return NextResponse.json({ error: 'Variant group not found' }, { status: 404 });
    }

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product is already in a variant group
    const existingMembership = await db.variantMember.findFirst({
      where: { productId },
    });

    if (existingMembership) {
      return NextResponse.json({
        error: 'Product is already in a variant group',
        existingGroupId: existingMembership.variantGroupId,
      }, { status: 400 });
    }

    // Get max display order
    const maxOrder = await db.variantMember.findFirst({
      where: { variantGroupId: id },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });

    const displayOrder = (maxOrder?.displayOrder ?? -1) + 1;

    // Create membership
    const member = await db.variantMember.create({
      data: {
        variantGroupId: id,
        productId,
        color,
        colorAr,
        variantImage,
        variantNotes,
        displayOrder,
      },
      include: {
        product: {
          select: {
            id: true,
            sourceRow: true,
            ndNumber: true,
            barcode: true,
            nameEn: true,
            color: true,
            colorAr: true,
          },
        },
      },
    });

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error adding member to variant group:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}

/**
 * GET /api/variants/[id]/members
 * Get all members of a variant group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const members = await db.variantMember.findMany({
      where: { variantGroupId: id },
      include: {
        product: {
          select: {
            id: true,
            sourceRow: true,
            ndNumber: true,
            barcode: true,
            nameEn: true,
            nameAr: true,
            color: true,
            colorAr: true,
            images: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching variant members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}