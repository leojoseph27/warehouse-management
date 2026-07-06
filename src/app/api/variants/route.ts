import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/variants
 * List all variant groups with their members
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    if (productId) {
      // Get variant groups for a specific product
      const memberships = await db.variantMember.findMany({
        where: { productId },
        include: {
          variantGroup: {
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
          },
        },
      });

      return NextResponse.json({ memberships });
    }

    // Get all variant groups
    const variantGroups = await db.variantGroup.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    // Get total count
    const total = await db.variantGroup.count();

    return NextResponse.json({ variantGroups, total });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
  }
}

/**
 * POST /api/variants
 * Create a new variant group
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, primaryProductId, productIds } = body;

    if (!primaryProductId || !productIds || productIds.length === 0) {
      return NextResponse.json({ error: 'Primary product and member products required' }, { status: 400 });
    }

    // Check if primary product exists
    const primaryProduct = await db.product.findUnique({
      where: { id: primaryProductId },
    });

    if (!primaryProduct) {
      return NextResponse.json({ error: 'Primary product not found' }, { status: 404 });
    }

    // Check if any of the products are already in a variant group
    const existingMemberships = await db.variantMember.findMany({
      where: { productId: { in: productIds } },
    });

    if (existingMemberships.length > 0) {
      const alreadyLinked = existingMemberships.map(m => m.productId);
      return NextResponse.json({
        error: 'Some products are already in variant groups',
        alreadyLinked,
      }, { status: 400 });
    }

    // Create variant group with members
    const variantGroup = await db.variantGroup.create({
      data: {
        name,
        primaryProductId,
        members: {
          create: productIds.map((productId: string, index: number) => ({
            productId,
            displayOrder: index,
          })),
        },
      },
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

    return NextResponse.json({ variantGroup });
  } catch (error) {
    console.error('Error creating variant group:', error);
    return NextResponse.json({ error: 'Failed to create variant group' }, { status: 500 });
  }
}