import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx-js-style';

/**
 * GET /api/variants
 * List all variant groups with their members
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const mode = searchParams.get('mode') || '';

    // ── Export mode: returns Excel file of all variant relationships ──
    if (mode === 'export') {
      const variantGroups = await db.variantGroup.findMany({
        include: {
          members: {
            include: {
              product: {
                select: {
                  id: true, ndNumber: true, barcode: true, nameEn: true, productId: true,
                },
              },
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Build rows: one per variant relationship
      const rows: any[] = [];
      for (const group of variantGroups) {
        const parentMember = group.members.find(m => m.productId === group.primaryProductId);
        const parent = parentMember?.product;
        const parentNd = parent?.ndNumber || '';
        const parentBarcode = parent?.barcode || '';
        const parentName = parent?.nameEn || '';

        for (const member of group.members) {
          if (member.productId === group.primaryProductId) continue; // skip parent
          const variant = member.product;
          rows.push({
            'Parent ND': parentNd,
            'Parent Barcode': parentBarcode,
            'Parent Name': parentName,
            'Variant ND': variant?.ndNumber || '',
            'Variant Barcode': variant?.barcode || '',
            'Variant Name': variant?.nameEn || '',
            'Variant Color': member.color || '',
          });
        }
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Variant Relationships');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="variant_relationships.xlsx"',
        },
      });
    }

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

    // Get all variant groups with full product details (single query, no N+1)
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
                productId: true,
                nameEn: true,
                nameAr: true,
                color: true,
                colorAr: true,
                brand: true,
                category: true,
                productFamily: true,
                productType: true,
                validationStatus: true,
                images: {
                  select: { id: true, imageUrl: true, thumbnailUrl: true, isPrimary: true },
                  take: 1,
                  orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
                },
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get stats for the explorer
    const totalGroups = await db.variantGroup.count();
    const totalVariantProducts = await db.variantMember.count();
    const totalProducts = await db.product.count();
    const unlinkedProducts = totalProducts - totalVariantProducts;

    return NextResponse.json({
      variantGroups,
      total: totalGroups,
      stats: {
        totalGroups,
        totalVariantProducts,
        totalParentProducts: totalGroups, // each group has 1 parent
        unlinkedProducts,
        totalProducts,
      },
    });
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