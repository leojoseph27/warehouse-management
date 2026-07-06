import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/variants/[id]
 * Get a specific variant group with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const variantGroup = await db.variantGroup.findUnique({
      where: { id },
      include: {
        members: {
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
                productType: true,
                brand: true,
                images: true,
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!variantGroup) {
      return NextResponse.json({ error: 'Variant group not found' }, { status: 404 });
    }

    return NextResponse.json({ variantGroup });
  } catch (error) {
    console.error('Error fetching variant group:', error);
    return NextResponse.json({ error: 'Failed to fetch variant group' }, { status: 500 });
  }
}

/**
 * PATCH /api/variants/[id]
 * Update variant group (name, add/remove members, update member details)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, addProductIds, removeProductIds, memberUpdates } = body;

    // Check if variant group exists
    const existingGroup = await db.variantGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: 'Variant group not found' }, { status: 404 });
    }

    // Build update operations
    const updateOps: any = {};

    if (name !== undefined) {
      updateOps.name = name;
    }

    // Remove members if specified
    if (removeProductIds && removeProductIds.length > 0) {
      await db.variantMember.deleteMany({
        where: {
          variantGroupId: id,
          productId: { in: removeProductIds },
        },
      });
    }

    // Add new members if specified
    if (addProductIds && addProductIds.length > 0) {
      // Check if products are already in a variant group
      const existingMemberships = await db.variantMember.findMany({
        where: { productId: { in: addProductIds } },
      });

      if (existingMemberships.length > 0) {
        const alreadyLinked = existingMemberships.map(m => m.productId);
        return NextResponse.json({
          error: 'Some products are already in variant groups',
          alreadyLinked,
        }, { status: 400 });
      }

      // Get max display order
      const maxOrder = await db.variantMember.findFirst({
        where: { variantGroupId: id },
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });

      const startOrder = (maxOrder?.displayOrder ?? -1) + 1;

      await db.variantMember.createMany({
        data: addProductIds.map((productId: string, index: number) => ({
          variantGroupId: id,
          productId,
          displayOrder: startOrder + index,
        })),
      });
    }

    // Update member details (color, variantImage, notes)
    if (memberUpdates && memberUpdates.length > 0) {
      for (const update of memberUpdates) {
        await db.variantMember.update({
          where: { id: update.memberId },
          data: {
            color: update.color,
            colorAr: update.colorAr,
            variantImage: update.variantImage,
            variantNotes: update.variantNotes,
            displayOrder: update.displayOrder,
          },
        });
      }
    }

    // Update the group itself
    if (Object.keys(updateOps).length > 0) {
      await db.variantGroup.update({
        where: { id },
        data: updateOps,
      });
    }

    // Fetch updated group
    const updatedGroup = await db.variantGroup.findUnique({
      where: { id },
      include: {
        members: {
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
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ variantGroup: updatedGroup });
  } catch (error) {
    console.error('Error updating variant group:', error);
    return NextResponse.json({ error: 'Failed to update variant group' }, { status: 500 });
  }
}

/**
 * DELETE /api/variants/[id]
 * Delete a variant group (keeps products intact)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if variant group exists
    const existingGroup = await db.variantGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: 'Variant group not found' }, { status: 404 });
    }

    // Delete all members first (cascade delete handles this in schema)
    // Then delete the group
    await db.variantGroup.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Variant group deleted successfully' });
  } catch (error) {
    console.error('Error deleting variant group:', error);
    return NextResponse.json({ error: 'Failed to delete variant group' }, { status: 500 });
  }
}