import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/products/stats
 *
 * Returns catalog statistics including new 52-column quality checks,
 * modified products count, and variant groups count.
 */
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total Products
    const totalProducts = await db.product.count();

    // Added Today
    const productsAddedToday = await db.product.count({
      where: { createdAt: { gte: today } },
    });

    // Missing Images: products with no images
    const productsWithImages = await db.product.count({
      where: { images: { some: {} } },
    });
    const productsMissingImages = totalProducts - productsWithImages;

    // Missing Barcode
    const productsMissingBarcode = await db.product.count({
      where: { barcode: null },
    });

    // Missing Dimensions (any of length, width, height is null)
    const productsWithAllDims = await db.product.count({
      where: {
        length: { not: null },
        width: { not: null },
        height: { not: null },
      },
    });
    const productsMissingDimensions = totalProducts - productsWithAllDims;

    // Missing Classification (department is null)
    const productsMissingClassification = await db.product.count({
      where: { department: null },
    });

    // Missing Name EN
    const productsMissingNameEn = await db.product.count({
      where: { nameEn: null },
    });

    // Missing Price (defaultPrice is null)
    const productsMissingPrice = await db.product.count({
      where: { defaultPrice: null },
    });

    // Products with Modifications (products that have an original record AND differ from it)
    // This counts products that were imported from ERP and have been manually edited
    const productsWithOriginals = await db.productOriginal.count();

    // For each product with an original, check if any tracked field differs
    // We'll use raw SQL for efficiency since we need to compare many fields
    const modifiedProductsCount = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM products p
      INNER JOIN product_originals po ON p.id = po.productId
      WHERE
        (p.product_id IS DISTINCT FROM po.orig_product_id) OR
        (p.sku IS DISTINCT FROM po.sku) OR
        (p.nd_number IS DISTINCT FROM po.nd_number) OR
        (p.barcode IS DISTINCT FROM po.barcode) OR
        (p.legacy_code IS DISTINCT FROM po.legacy_code) OR
        (p.brand IS DISTINCT FROM po.brand) OR
        (p.model IS DISTINCT FROM po.model) OR
        (p.department IS DISTINCT FROM po.department) OR
        (p.category IS DISTINCT FROM po.category) OR
        (p.subcategory IS DISTINCT FROM po.subcategory) OR
        (p.product_family IS DISTINCT FROM po.product_family) OR
        (p.product_type IS DISTINCT FROM po.product_type) OR
        (p.name_ar IS DISTINCT FROM po.name_ar) OR
        (p.name_en IS DISTINCT FROM po.name_en) OR
        (p.short_desc_ar IS DISTINCT FROM po.short_desc_ar) OR
        (p.short_desc_en IS DISTINCT FROM po.short_desc_en) OR
        (p.long_desc_ar IS DISTINCT FROM po.long_desc_ar) OR
        (p.long_desc_en IS DISTINCT FROM po.long_desc_en) OR
        (p.color IS DISTINCT FROM po.color) OR
        (p.material IS DISTINCT FROM po.material) OR
        (p.capacity IS DISTINCT FROM po.capacity) OR
        (p.capacity_unit IS DISTINCT FROM po.capacity_unit) OR
        (p.weight IS DISTINCT FROM po.weight) OR
        (p.weight_unit IS DISTINCT FROM po.weight_unit) OR
        (p.length IS DISTINCT FROM po.length) OR
        (p.width IS DISTINCT FROM po.width) OR
        (p.height IS DISTINCT FROM po.height) OR
        (p.diameter IS DISTINCT FROM po.diameter) OR
        (p.dimension_unit IS DISTINCT FROM po.dimension_unit) OR
        (p.country_of_origin IS DISTINCT FROM po.country_of_origin) OR
        (p.unit IS DISTINCT FROM po.unit) OR
        (p.default_price IS DISTINCT FROM po.default_price) OR
        (p.name_en IS DISTINCT FROM po.name_en) OR
        (p.seo_title_en IS DISTINCT FROM po.seo_title_en) OR
        (p.seo_title_ar IS DISTINCT FROM po.seo_title_ar) OR
        (p.seo_description_en IS DISTINCT FROM po.seo_description_en) OR
        (p.seo_description_ar IS DISTINCT FROM po.seo_description_ar) OR
        (p.search_keywords IS DISTINCT FROM po.search_keywords) OR
        (p.internal_notes IS DISTINCT FROM po.internal_notes) OR
        (p.validation_status IS DISTINCT FROM po.validation_status) OR
        (p.pieces IS DISTINCT FROM po.pieces) OR
        (p.set_count IS DISTINCT FROM po.set_count) OR
        (p.shape IS DISTINCT FROM po.shape) OR
        (p.finish IS DISTINCT FROM po.finish) OR
        (p.additional_info IS DISTINCT FROM po.additional_info)
    `;

    const productsWithModifications = Number(modifiedProductsCount[0]?.count ?? 0);

    // Total Variant Groups
    const totalVariantGroups = await db.variantGroup.count();

    return NextResponse.json({
      totalProducts,
      productsAddedToday,
      productsMissingImages,
      productsMissingBarcode,
      productsMissingDimensions,
      productsMissingClassification,
      productsMissingNameEn,
      productsMissingPrice,
      productsWithModifications,
      totalVariantGroups,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}