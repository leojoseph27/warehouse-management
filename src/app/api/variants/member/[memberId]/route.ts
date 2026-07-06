import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PATCH /api/variants/member/[memberId]
 * Update variant member details (color, variantImage, notes, displayOrder)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const body = await request.json();
    const { color, colorAr, variantImage, variantNotes, displayOrder } = body;

    // Check if member exists
    const existingMember = await db.variantMember.findUnique({
      where: { id: memberId },
    });

    if (!existingMember) {
      return NextResponse.json({ error: 'Variant member not found' }, { status: 404 });
    }

    // Update member
    const updatedMember = await db.variantMember.update({
      where: { id: memberId },
      data: {
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

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error('Error updating variant member:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

/**
 * DELETE /api/variants/member/[memberId]
 * Remove a product from a variant group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    // Check if member exists
    const existingMember = await db.variantMember.findUnique({
      where: { id: memberId },
    });

    if (!existingMember) {
      return NextResponse.json({ error: 'Variant member not found' }, { status: 404 });
    }

    // Delete member
    await db.variantMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ message: 'Member removed from variant group' });
  } catch (error) {
    console.error('Error removing variant member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}