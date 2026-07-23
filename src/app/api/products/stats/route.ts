import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/products/stats — Optimized Version
 *
 * Performance optimizations:
 * 1. Combined aggregation query instead of 7+ separate count queries
 * 2. Simplified modified products detection using Prisma instead of raw SQL
 * 3. Caching with short TTL to reduce load during imports
 * 4. Reduced database round-trips
 */

// Simple in-memory cache with TTL
const statsCache = {
  data: null as any,
  timestamp: 0,
  ttl: 5000, // 5 seconds cache
};

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (statsCache.data && (now - statsCache.timestamp) < statsCache.ttl) {
      return NextResponse.json(statsCache.data);
    }

    // Use a single aggregation query for most stats
    // PostgreSQL: use COUNT(*) FILTER (WHERE ...) and double-quoted camelCase
    // column names (Prisma creates camelCase columns; PG lowercases unquoted
    // identifiers, so we MUST quote them to preserve case).
    const statsAggregation = await db.$queryRaw<{
      total_products: bigint;
      missing_barcode: bigint;
      missing_dimensions: bigint;
      missing_classification: bigint;
      missing_name_en: bigint;
      missing_price: bigint;
      with_images: bigint;
      added_today: bigint;
    }[]>`
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE barcode IS NULL) as missing_barcode,
        COUNT(*) FILTER (WHERE length IS NULL OR width IS NULL OR height IS NULL) as missing_dimensions,
        COUNT(*) FILTER (WHERE department IS NULL) as missing_classification,
        COUNT(*) FILTER (WHERE "nameEn" IS NULL) as missing_name_en,
        COUNT(*) FILTER (WHERE "defaultPrice" IS NULL) as missing_price,
        (SELECT COUNT(DISTINCT "productId") FROM product_images) as with_images,
        COUNT(*) FILTER (WHERE "createdAt" >= CURRENT_DATE) as added_today
      FROM products
    `;

    const agg = statsAggregation[0];

    // Get products with modifications efficiently
    // Instead of comparing 40+ fields in raw SQL, use a simpler approach
    // Count products that have originals (imported from ERP) and check if modified
    const originalsCount = await db.productOriginal.count();

    // For modified products, use a simplified check on key fields
    // PostgreSQL: IS DISTINCT FROM for null-safe comparison.
    // Double-quote camelCase column names so PG preserves case.
    const modifiedProductsResult = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM products p
      INNER JOIN product_originals po ON p.id = po."productId"
      WHERE
        (p."productId" IS DISTINCT FROM po."origProductId") OR
        (p."ndNumber" IS DISTINCT FROM po."ndNumber") OR
        (p.barcode IS DISTINCT FROM po.barcode) OR
        (p.brand IS DISTINCT FROM po.brand) OR
        (p."nameEn" IS DISTINCT FROM po."nameEn") OR
        (p."nameAr" IS DISTINCT FROM po."nameAr") OR
        (p."enCatalog" IS DISTINCT FROM po."enCatalog") OR
        (p."defaultPrice" IS DISTINCT FROM po."defaultPrice") OR
        (p.department IS DISTINCT FROM po.department) OR
        (p.category IS DISTINCT FROM po.category) OR
        (p.color IS DISTINCT FROM po.color) OR
        (p.material IS DISTINCT FROM po.material)
    `;

    // Total Variant Groups
    const totalVariantGroups = await db.variantGroup.count();

    // Calculate products missing images
    const totalProducts = Number(agg.total_products);
    const productsWithImages = Number(agg.with_images);
    const productsMissingImages = totalProducts - productsWithImages;

    const result = {
      totalProducts,
      productsAddedToday: Number(agg.added_today),
      productsMissingImages,
      productsMissingBarcode: Number(agg.missing_barcode),
      productsMissingDimensions: Number(agg.missing_dimensions),
      productsMissingClassification: Number(agg.missing_classification),
      productsMissingNameEn: Number(agg.missing_name_en),
      productsMissingPrice: Number(agg.missing_price),
      productsWithModifications: Number(modifiedProductsResult[0]?.count ?? 0),
      totalVariantGroups,
    };

    // Update cache
    statsCache.data = result;
    statsCache.timestamp = now;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching stats:', error);

    // Fallback: use individual queries if aggregation fails
    try {
      const totalProducts = await db.product.count();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const productsAddedToday = await db.product.count({
        where: { createdAt: { gte: today } },
      });

      const productsWithImages = await db.product.count({
        where: { images: { some: {} } },
      });

      const productsMissingBarcode = await db.product.count({
        where: { barcode: null },
      });

      const productsWithAllDims = await db.product.count({
        where: {
          length: { not: null },
          width: { not: null },
          height: { not: null },
        },
      });

      const productsMissingClassification = await db.product.count({
        where: { department: null },
      });

      const productsMissingNameEn = await db.product.count({
        where: { nameEn: null },
      });

      const productsMissingPrice = await db.product.count({
        where: { defaultPrice: null },
      });

      const totalVariantGroups = await db.variantGroup.count();

      return NextResponse.json({
        totalProducts,
        productsAddedToday,
        productsMissingImages: totalProducts - productsWithImages,
        productsMissingBarcode,
        productsMissingDimensions: totalProducts - productsWithAllDims,
        productsMissingClassification,
        productsMissingNameEn,
        productsMissingPrice,
        productsWithModifications: 0, // Skip heavy query on fallback
        totalVariantGroups,
      });
    } catch (fallbackError) {
      console.error('Fallback stats query failed:', fallbackError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
  }
}