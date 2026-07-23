import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeProduct, applyAutoDerivations } from '@/lib/serialize-product';
import {
  BRAND_OPTIONS,
  DEPARTMENTS,
  PRODUCT_FAMILIES,
  ALL_PRODUCT_TYPES,
  COLOR_OPTIONS,
  MATERIAL_OPTIONS,
  COUNTRY_OPTIONS,
  SHAPE_OPTIONS,
  FINISH_OPTIONS,
  VALIDATION_STATUS_OPTIONS,
  UNIT_OPTIONS,
} from '@/lib/lookups';

// ─────────────────────────────────────────────────────────────
// GET /api/products
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || '';

    // ── ND Groups mode ──
    if (mode === 'nd-groups') {
      const search = searchParams.get('search') || '';

      const where: any = { ndNumber: { not: null } };
      if (search) {
        where.ndNumber = { not: null, contains: search, mode: 'insensitive' };
      }

      const rows = await db.product.findMany({
        where,
        select: { ndNumber: true },
      });

      const groupMap = new Map<string, number>();
      for (const row of rows) {
        const nd = row.ndNumber;
        if (nd) {
          groupMap.set(nd, (groupMap.get(nd) || 0) + 1);
        }
      }

      const groups = Array.from(groupMap.entries())
        .map(([ndNumber, count]) => ({ ndNumber, count }))
        .sort((a, b) => b.count - a.count || a.ndNumber.localeCompare(b.ndNumber));

      return NextResponse.json({ groups, totalGroups: groups.length });
    }

    // ── Suggestions mode ── (Optimized with single aggregation query)
    if (mode === 'suggestions') {
      // Use a single raw query to get all distinct values at once
      // This is MUCH faster than 13 separate findMany with distinct
      try {
        // PostgreSQL: ARRAY_AGG(DISTINCT ...) FILTER (WHERE ...) returns native arrays.
        // Column names are double-quoted to preserve camelCase (PG lowercases
        // unquoted identifiers, but Prisma creates camelCase columns).
        const suggestionsData = await db.$queryRaw<{
          brands: string[];
          departments: string[];
          categories: string[];
          subcategories: string[];
          product_families: string[];
          product_types: string[];
          colors: string[];
          materials: string[];
          countries: string[];
          shapes: string[];
          finishes: string[];
          validation_statuses: string[];
          units: string[];
        }[]>`
          SELECT
            ARRAY_AGG(DISTINCT brand) FILTER (WHERE brand IS NOT NULL) as brands,
            ARRAY_AGG(DISTINCT department) FILTER (WHERE department IS NOT NULL) as departments,
            ARRAY_AGG(DISTINCT category) FILTER (WHERE category IS NOT NULL) as categories,
            ARRAY_AGG(DISTINCT subcategory) FILTER (WHERE subcategory IS NOT NULL) as subcategories,
            ARRAY_AGG(DISTINCT "productFamily") FILTER (WHERE "productFamily" IS NOT NULL) as product_families,
            ARRAY_AGG(DISTINCT "productType") FILTER (WHERE "productType" IS NOT NULL) as product_types,
            ARRAY_AGG(DISTINCT color) FILTER (WHERE color IS NOT NULL) as colors,
            ARRAY_AGG(DISTINCT material) FILTER (WHERE material IS NOT NULL) as materials,
            ARRAY_AGG(DISTINCT "countryOfOrigin") FILTER (WHERE "countryOfOrigin" IS NOT NULL) as countries,
            ARRAY_AGG(DISTINCT shape) FILTER (WHERE shape IS NOT NULL) as shapes,
            ARRAY_AGG(DISTINCT finish) FILTER (WHERE finish IS NOT NULL) as finishes,
            ARRAY_AGG(DISTINCT "validationStatus") FILTER (WHERE "validationStatus" IS NOT NULL) as validation_statuses,
            ARRAY_AGG(DISTINCT unit) FILTER (WHERE unit IS NOT NULL) as units
          FROM products
        `;

        const data = suggestionsData[0] || {};

        // Merge DB values with lookup table values and sort
        const mergeAndSort = (dbValues: string[] | null, lookupValues: string[]): string[] => {
          const combined = new Set([...lookupValues, ...(dbValues || [])]);
          return [...combined].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        };

        return NextResponse.json({
          brands: mergeAndSort(data.brands, BRAND_OPTIONS),
          departments: mergeAndSort(data.departments, DEPARTMENTS),
          categories: mergeAndSort(data.categories, []),
          subcategories: mergeAndSort(data.subcategories, []),
          productFamilies: mergeAndSort(data.product_families, [...PRODUCT_FAMILIES]),
          productTypes: mergeAndSort(data.product_types, ALL_PRODUCT_TYPES),
          colors: mergeAndSort(data.colors, COLOR_OPTIONS),
          materials: mergeAndSort(data.materials, MATERIAL_OPTIONS),
          countriesOfOrigin: mergeAndSort(data.countries, [...COUNTRY_OPTIONS]),
          shapes: mergeAndSort(data.shapes, [...SHAPE_OPTIONS]),
          finishes: mergeAndSort(data.finishes, [...FINISH_OPTIONS]),
          validationStatuses: mergeAndSort(data.validation_statuses, [...VALIDATION_STATUS_OPTIONS]),
          units: mergeAndSort(data.units, [...UNIT_OPTIONS]),
        });
      } catch (rawError) {
        // Fallback to original method if raw query fails
        console.error('Suggestions raw query failed, using fallback:', rawError);

        const [dbBrands, dbDepartments, dbCategories, dbSubcategories, dbProductFamilies, dbProductTypes, dbColors, dbMaterials, dbCountries, dbShapes, dbFinishes, dbValidationStatuses, dbUnits] = await Promise.all([
          db.product.findMany({ where: { brand: { not: null } }, select: { brand: true }, distinct: ['brand'] }),
          db.product.findMany({ where: { department: { not: null } }, select: { department: true }, distinct: ['department'] }),
          db.product.findMany({ where: { category: { not: null } }, select: { category: true }, distinct: ['category'] }),
          db.product.findMany({ where: { subcategory: { not: null } }, select: { subcategory: true }, distinct: ['subcategory'] }),
          db.product.findMany({ where: { productFamily: { not: null } }, select: { productFamily: true }, distinct: ['productFamily'] }),
          db.product.findMany({ where: { productType: { not: null } }, select: { productType: true }, distinct: ['productType'] }),
          db.product.findMany({ where: { color: { not: null } }, select: { color: true }, distinct: ['color'] }),
          db.product.findMany({ where: { material: { not: null } }, select: { material: true }, distinct: ['material'] }),
          db.product.findMany({ where: { countryOfOrigin: { not: null } }, select: { countryOfOrigin: true }, distinct: ['countryOfOrigin'] }),
          db.product.findMany({ where: { shape: { not: null } }, select: { shape: true }, distinct: ['shape'] }),
          db.product.findMany({ where: { finish: { not: null } }, select: { finish: true }, distinct: ['finish'] }),
          db.product.findMany({ where: { validationStatus: { not: null } }, select: { validationStatus: true }, distinct: ['validationStatus'] }),
          db.product.findMany({ where: { unit: { not: null } }, select: { unit: true }, distinct: ['unit'] }),
        ]);

        const merge = (dbRows: { [key: string]: string | null }[], key: string, lookupValues: string[]): string[] => {
          const dbValues = dbRows.map(r => r[key]).filter((v): v is string => v !== null && v !== '');
          const combined = new Set([...lookupValues, ...dbValues]);
          return [...combined].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        };

        return NextResponse.json({
          brands: merge(dbBrands, 'brand', BRAND_OPTIONS),
          departments: merge(dbDepartments, 'department', DEPARTMENTS),
          categories: merge(dbCategories, 'category', []),
          subcategories: merge(dbSubcategories, 'subcategory', []),
          productFamilies: merge(dbProductFamilies, 'productFamily', [...PRODUCT_FAMILIES]),
          productTypes: merge(dbProductTypes, 'productType', ALL_PRODUCT_TYPES),
          colors: merge(dbColors, 'color', COLOR_OPTIONS),
          materials: merge(dbMaterials, 'material', MATERIAL_OPTIONS),
          countriesOfOrigin: merge(dbCountries, 'countryOfOrigin', [...COUNTRY_OPTIONS]),
          shapes: merge(dbShapes, 'shape', [...SHAPE_OPTIONS]),
          finishes: merge(dbFinishes, 'finish', [...FINISH_OPTIONS]),
          validationStatuses: merge(dbValidationStatuses, 'validationStatus', [...VALIDATION_STATUS_OPTIONS]),
          units: merge(dbUnits, 'unit', [...UNIT_OPTIONS]),
        });
      }
    }

    // ── Normal product listing mode ──
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const productFamily = searchParams.get('productFamily') || '';
    const productType = searchParams.get('productType') || '';
    const brand = searchParams.get('brand') || '';
    const color = searchParams.get('color') || '';
    const material = searchParams.get('material') || '';
    const countryOfOrigin = searchParams.get('countryOfOrigin') || '';
    const shape = searchParams.get('shape') || '';
    const validationStatus = searchParams.get('validationStatus') || '';
    const unit = searchParams.get('unit') || '';
    const ndNumber = searchParams.get('ndNumber') || '';
    const nameEn = searchParams.get('nameEn') || '';
    const barcode = searchParams.get('barcode') || '';
    const sourceRowMin = searchParams.get('sourceRowMin');
    const sourceRowMax = searchParams.get('sourceRowMax');
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    // Recently Updated: onlyModified=1 → only products where updatedAt > createdAt
    const onlyModified = searchParams.get('onlyModified') === '1';
    // Recently Added: recentlyAddedDays=N → only products with createdAt within last N days
    const recentlyAddedDays = parseInt(searchParams.get('recentlyAddedDays') || '0', 10);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'sourceRow';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Sort mapping
    const sortColumn =
      sortBy === 'sourceRow' ? 'sourceRow' :
      sortBy === 'ndNumber' ? 'ndNumber' :
      sortBy === 'nameEn' ? 'nameEn' :
      sortBy === 'productType' ? 'productType' :
      sortBy === 'productFamily' ? 'productFamily' :
      sortBy === 'recentlyUpdated' ? 'updatedAt' :
      sortBy === 'recentlyAdded' ? 'createdAt' :
      sortBy === 'defaultPrice' ? 'defaultPrice' :
      'sourceRow';
    const orderDir = sortOrder === 'desc' ? 'desc' : 'asc';

    // Build where clause — all filters are direct DB column filters now
    const where: any = {};

    // Search across multiple fields
    if (search) {
      where.OR = [
        { ndNumber: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { productId: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { productType: { contains: search, mode: 'insensitive' } },
        { productFamily: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { seoTitleEn: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Direct column filters
    if (ndNumber) where.ndNumber = { ...where.ndNumber, contains: ndNumber, mode: 'insensitive' };
    // Dedicated Name EN filter — case-insensitive partial match on nameEn only
    // (the general `search` param searches across 11 fields; this one is scoped to nameEn)
    if (nameEn) where.nameEn = { ...where.nameEn, contains: nameEn, mode: 'insensitive' };
    // Barcode filter — exact match (used by the barcode scanner in the variant
    // manager). The scanner reads the full barcode, so we match exactly.
    if (barcode) where.barcode = { equals: barcode };
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (subcategory) where.subcategory = { contains: subcategory, mode: 'insensitive' };
    // Product Family / Product Type: EXACT match (equals), not substring.
    // The previous `contains` meant "Kitchen" matched both "Kitchen" and "Kitchenware",
    // and the UI's lookup-table suggestions didn't match DB values, so the filter
    // silently returned 0 results. Switching to `equals` makes the dropdown values
    // match DB values exactly.
    if (productFamily) where.productFamily = { equals: productFamily, mode: 'insensitive' };
    if (productType) where.productType = { equals: productType, mode: 'insensitive' };
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (color) where.color = { contains: color, mode: 'insensitive' };
    if (material) where.material = { contains: material, mode: 'insensitive' };
    if (countryOfOrigin) where.countryOfOrigin = { contains: countryOfOrigin, mode: 'insensitive' };
    if (shape) where.shape = { contains: shape, mode: 'insensitive' };
    if (validationStatus) where.validationStatus = { equals: validationStatus };
    if (unit) where.unit = { equals: unit };

    // Source Row range filter — supports exact, >N, <N, and range (min-max).
    // The UI parses the user's input string and sends sourceRowMin / sourceRowMax.
    if (sourceRowMin) {
      const n = parseInt(sourceRowMin, 10);
      if (!Number.isNaN(n)) where.sourceRow = { ...where.sourceRow, gte: n };
    }
    if (sourceRowMax) {
      const n = parseInt(sourceRowMax, 10);
      if (!Number.isNaN(n)) where.sourceRow = { ...where.sourceRow, lte: n };
    }

    // Recently Updated filter — only show products that were actually modified
    // after creation (updatedAt > createdAt). Prisma's raw comparison: we use
    // $queryRaw-friendly approach via `where` with a custom filter.
    // Since Prisma doesn't support column-to-column comparison in `where`, we
    // filter in the DB by using a raw SQL id filter is not feasible at scale;
    // instead we use Prisma's approach: query with a raw WHERE clause appended.
    // Implementation: fetch matching IDs via $queryRaw, then filter the main
    // query by those IDs. For modest datasets (<= 10k products) this is fast.
    if (onlyModified) {
      const modifiedIds: { id: string }[] = await db.$queryRaw`
        SELECT id FROM products WHERE "updatedAt" > "createdAt"
      `;
      const idList = modifiedIds.map(r => r.id);
      where.id = { ...where.id, in: idList };
      // Sort by updatedAt DESC when onlyModified is on, so the most recently
      // edited product appears first (the user's modification sequence).
      // Override sortColumn/orderDir here:
    }

    // Recently Added filter — only products added within the last N days
    if (recentlyAddedDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - recentlyAddedDays);
      where.createdAt = { ...where.createdAt, gte: cutoff };
    }

    // Override sort: when onlyModified is on, ALWAYS sort by updatedAt DESC
    // (most recent edit first) regardless of the user's sortBy/sortOrder, so
    // the modification sequence is preserved: if A was edited, then B, then C,
    // the list shows C, B, A.
    let finalSortColumn = sortColumn;
    let finalOrderDir = orderDir;
    if (onlyModified) {
      finalSortColumn = 'updatedAt';
      finalOrderDir = 'desc';
    } else if (recentlyAddedDays > 0) {
      // Recently Added: sort by createdAt DESC (newest addition first)
      finalSortColumn = 'createdAt';
      finalOrderDir = 'desc';
    }

    // Price range filters
    if (priceMin) {
      where.defaultPrice = { ...where.defaultPrice, gte: parseFloat(priceMin) };
    }
    if (priceMax) {
      where.defaultPrice = { ...where.defaultPrice, lte: parseFloat(priceMax) };
    }

    const [total, products] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        include: {
          images: { orderBy: { displayOrder: 'asc' } },
          original: true,
          variantMemberships: { include: { variantGroup: { select: { id: true, primaryProductId: true } } } },
        },
        orderBy: { [finalSortColumn]: finalOrderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const mappedProducts = products.map(p => serializeProduct(p));

    return NextResponse.json({ products: mappedProducts, total, page, limit });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/products
// ─────────────────────────────────────────────────────────────

/** All 52 product fields that can be accepted in POST body */
const PRODUCT_FIELDS = [
  // Product Identity
  'sourceRow', 'productId', 'sku', 'ndNumber', 'barcode', 'legacyCode',
  'brand', 'brandAr', 'brandCode', 'model',
  // Classification
  'department', 'category', 'subcategory', 'sectionCode',
  'productFamily', 'productType',
  // Product Information
  'nameAr', 'enCatalog', 'nameEn', 'shortDescAr', 'shortDescEn',
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract only known product fields
    const rawData: Record<string, any> = {};
    for (const field of PRODUCT_FIELDS) {
      if (field in body) {
        rawData[field] = coerceFieldValue(field, body[field]);
      }
    }

    // Apply auto-derivations
    const data = applyAutoDerivations(rawData);

    // Create product and its original record for change tracking
    const product = await db.product.create({
      data,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: true,
      },
    });

    // Create ProductOriginal for change tracking (baseline for manually added products)
    await db.productOriginal.create({
      data: {
        productId: product.id,
        sourceRow: product.sourceRow,
        origProductId: product.productId,
        sku: product.sku,
        ndNumber: product.ndNumber,
        barcode: product.barcode,
        legacyCode: product.legacyCode,
        brand: product.brand,
        brandAr: product.brandAr,
        brandCode: product.brandCode,
        model: product.model,
        department: product.department,
        category: product.category,
        subcategory: product.subcategory,
        sectionCode: product.sectionCode,
        productFamily: product.productFamily,
        productType: product.productType,
        nameAr: product.nameAr,
        enCatalog: product.enCatalog,
        nameEn: product.nameEn,
        shortDescAr: product.shortDescAr,
        shortDescEn: product.shortDescEn,
        longDescAr: product.longDescAr,
        longDescEn: product.longDescEn,
        color: product.color,
        colorAr: product.colorAr,
        material: product.material,
        materialAr: product.materialAr,
        capacity: product.capacity,
        capacityUnit: product.capacityUnit,
        weight: product.weight,
        weightUnit: product.weightUnit,
        length: product.length,
        width: product.width,
        height: product.height,
        diameter: product.diameter,
        dimensionUnit: product.dimensionUnit,
        countryOfOrigin: product.countryOfOrigin,
        unit: product.unit,
        minSalesMultiples: product.minSalesMultiples,
        defaultPrice: product.defaultPrice,
        seoTitleEn: product.seoTitleEn,
        seoTitleAr: product.seoTitleAr,
        seoDescriptionEn: product.seoDescriptionEn,
        seoDescriptionAr: product.seoDescriptionAr,
        searchKeywords: product.searchKeywords,
        internalNotes: product.internalNotes,
        validationStatus: product.validationStatus,
        confidenceScore: product.confidenceScore,
        pieces: product.pieces,
        setCount: product.setCount,
        shape: product.shape,
        finish: product.finish,
        additionalInfo: product.additionalInfo,
      }
    });

    // Fetch the product again with original included
    const productWithOriginal = await db.product.findUnique({
      where: { id: product.id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: true,
      },
    });

    return NextResponse.json(serializeProduct(productWithOriginal!), { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
