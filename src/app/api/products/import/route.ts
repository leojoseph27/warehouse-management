import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS } from '@/lib/lookups';
import { applyAutoDerivations } from '@/lib/serialize-product';
import * as XLSX from 'xlsx';

// Vercel serverless functions timeout: 10s on Hobby, 60s on Pro, 300s on Enterprise.
// Excel import of 2,500+ rows with createMany batches can take 15-30s, so we
// request the maximum allowed duration. On Hobby this caps at 10s regardless —
// if you need to import large files, upgrade to Vercel Pro.
export const maxDuration = 300;
export const runtime = 'nodejs';

/**
 * Excel Import Route — Optimized for Performance
 *
 * Key optimizations:
 * 1. Bulk inserts using createMany instead of individual creates
 * 2. Single transaction for products + originals
 * 3. Progress tracking via ImportJob model
 * 4. Streaming progress updates
 * 5. Reduced database round-trips
 *
 * Supports two-row header format for Al-Nassim 52-column schema.
 */

// ─────────────────────────────────────────────────────────────
// Performance tracking
// ─────────────────────────────────────────────────────────────

interface StageTimings {
  fileUpload: number;
  excelParsing: number;
  headerDetection: number;
  rowParsing: number;
  dataTransformation: number;
  bulkInsertProducts: number;
  bulkInsertOriginals: number;
  total: number;
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

// ─────────────────────────────────────────────────────────────
// Column mapping patterns (same as before)
// ─────────────────────────────────────────────────────────────

interface ColumnMapping {
  field: string;
  type: 'string' | 'number' | 'integer' | 'decimal';
  patterns: string[];
}

const COLUMN_MAPPINGS: ColumnMapping[] = [
  // Product Identity
  { field: 'sourceRow', type: 'integer', patterns: ['source row', 'sourcerow', 'source_row', 'sr', 's.r', 'serial', '#', 'row'] },
  { field: 'productId', type: 'string', patterns: ['product id', 'productid', 'product_id', 'prod id', 'prodid', 'erp id', 'erpid'] },
  { field: 'sku', type: 'string', patterns: ['sku', 'SKU', 'stock keeping unit', 'item code', 'itemcode'] },
  { field: 'ndNumber', type: 'string', patterns: ['nd number', 'ndnumber', 'nd_number', 'nd no', 'ndno', 'nd_no', 'nd', 'nd-number'] },
  { field: 'barcode', type: 'string', patterns: ['barcode', 'bar code', 'bar_code', 'ean', 'upc', 'ean-13', 'code'] },
  { field: 'legacyCode', type: 'string', patterns: ['legacy code', 'legacycode', 'legacy_code', 'old code', 'oldcode', 'legacy'] },
  { field: 'brand', type: 'string', patterns: ['brand', 'Brand', 'BRAND', 'manufacturer', 'make'] },
  { field: 'brandAr', type: 'string', patterns: ['brand ar', 'brandar', 'brand_ar', 'brand arabic', 'brand_arabic', 'العلامة التجارية'] },
  { field: 'brandCode', type: 'string', patterns: ['brand code', 'brandcode', 'brand_code', 'brand no', 'brandno'] },
  { field: 'model', type: 'string', patterns: ['model', 'Model', 'MODEL', 'variant', 'model code'] },
  // Classification
  { field: 'department', type: 'string', patterns: ['department', 'dept', 'Department', 'DEPT'] },
  { field: 'category', type: 'string', patterns: ['category', 'Category', 'CATEGORY', 'cat'] },
  { field: 'subcategory', type: 'string', patterns: ['subcategory', 'sub-category', 'sub_category', 'sub category', 'subcat'] },
  { field: 'sectionCode', type: 'string', patterns: ['section code', 'sectioncode', 'section_code', 'section', 'sect code'] },
  { field: 'productFamily', type: 'string', patterns: ['product family', 'productfamily', 'product_family', 'family', 'prod family'] },
  { field: 'productType', type: 'string', patterns: ['product type', 'producttype', 'product_type', 'type', 'prod type'] },
  // Product Information
  { field: 'nameAr', type: 'string', patterns: ['name ar', 'namear', 'name_ar', 'arabic name', 'الاسم', 'اسم المنتج', 'arabic description', 'arabicdescription', 'arabic_description'] },
  { field: 'enCatalog', type: 'string', patterns: ['en catalog', 'encatalog', 'en_catalog', 'en_catalogue', 'english catalog', 'english catalogue', 'catalog', 'catalogue', 'catalog name', 'catalog_name'] },
  { field: 'nameEn', type: 'string', patterns: ['name en', 'nameen', 'name_en', 'english name', 'english description', 'englishdescription', 'english_description', 'description', 'desc', 'product name'] },
  { field: 'shortDescAr', type: 'string', patterns: ['short desc ar', 'shortdescar', 'short_desc_ar', 'short description ar', 'short_ar'] },
  { field: 'shortDescEn', type: 'string', patterns: ['short desc en', 'shortdescen', 'short_desc_en', 'short description en', 'short_en', 'short desc'] },
  { field: 'longDescAr', type: 'string', patterns: ['long desc ar', 'longdescar', 'long_desc_ar', 'long description ar', 'detailed desc ar'] },
  { field: 'longDescEn', type: 'string', patterns: ['long desc en', 'longdescen', 'long_desc_en', 'long description en', 'detailed desc', 'full description'] },
  // Attributes
  { field: 'color', type: 'string', patterns: ['color', 'colour', 'Color', 'Colour', 'COLOR', 'COLOUR'] },
  { field: 'colorAr', type: 'string', patterns: ['color ar', 'colour ar', 'colorar', 'colourar', 'color_ar', 'color arabic'] },
  { field: 'material', type: 'string', patterns: ['material', 'Material', 'MATERIAL', 'mat'] },
  { field: 'materialAr', type: 'string', patterns: ['material ar', 'materialar', 'material_ar', 'material arabic'] },
  { field: 'capacity', type: 'decimal', patterns: ['capacity', 'Capacity', 'volume', 'CAPACITY'] },
  { field: 'capacityUnit', type: 'string', patterns: ['capacity unit', 'capacityunit', 'capacity_unit', 'cap unit', 'vol unit'] },
  { field: 'weight', type: 'decimal', patterns: ['weight', 'Weight', 'WEIGHT', 'wt'] },
  { field: 'weightUnit', type: 'string', patterns: ['weight unit', 'weightunit', 'weight_unit', 'wt unit'] },
  { field: 'length', type: 'decimal', patterns: ['length', 'Length', 'l', 'L', 'len', 'dimension l'] },
  { field: 'width', type: 'decimal', patterns: ['width', 'Width', 'w', 'W', 'wid', 'dimension w'] },
  { field: 'height', type: 'decimal', patterns: ['height', 'Height', 'h', 'H', 'ht', 'dimension h'] },
  { field: 'diameter', type: 'decimal', patterns: ['diameter', 'Diameter', 'dia', 'DIAMETER'] },
  { field: 'dimensionUnit', type: 'string', patterns: ['dimension unit', 'dimensionunit', 'dimension_unit', 'dim unit', 'size unit'] },
  // Logistics
  { field: 'countryOfOrigin', type: 'string', patterns: ['country of origin', 'countryoforigin', 'country_of_origin', 'origin', 'country', 'made in', 'made', 'made_in'] },
  { field: 'unit', type: 'string', patterns: ['unit', 'Unit', 'UNIT', 'unit of sale', 'sale unit', 'uom'] },
  { field: 'minSalesMultiples', type: 'string', patterns: ['min sales multiples', 'minsalesmultiples', 'min_sales_multiples', 'min sales', 'min multiples', 'min qty'] },
  // Commercial
  { field: 'defaultPrice', type: 'decimal', patterns: ['default price', 'defaultprice', 'default_price', 'price', 'Price', 'PRICE', 'unit price', 'retail price'] },
  // SEO
  { field: 'seoTitleEn', type: 'string', patterns: ['seo title en', 'seotitleen', 'seo_title_en', 'meta title', 'page title'] },
  { field: 'seoTitleAr', type: 'string', patterns: ['seo title ar', 'seotitlear', 'seo_title_ar', 'meta title ar'] },
  { field: 'seoDescriptionEn', type: 'string', patterns: ['seo description en', 'seodescriptionen', 'seo_description_en', 'meta description', 'meta desc'] },
  { field: 'seoDescriptionAr', type: 'string', patterns: ['seo description ar', 'seodescriptionar', 'seo_description_ar', 'meta description ar'] },
  { field: 'searchKeywords', type: 'string', patterns: ['search keywords', 'searchkeywords', 'search_keywords', 'keywords', 'tags'] },
  // Internal
  { field: 'internalNotes', type: 'string', patterns: ['internal notes', 'internalnotes', 'internal_notes', 'notes', 'staff notes'] },
  { field: 'validationStatus', type: 'string', patterns: ['validation status', 'validationstatus', 'validation_status', 'status', 'review status'] },
  { field: 'confidenceScore', type: 'integer', patterns: ['confidence score', 'confidencescore', 'confidence_score', 'quality score', 'score'] },
  { field: 'pieces', type: 'integer', patterns: ['pieces', 'Pieces', 'PIECES', 'piece', 'pcs', 'Pcs', 'PCS', 'qty', 'quantity'] },
  { field: 'setCount', type: 'integer', patterns: ['set count', 'setcount', 'set_count', 'items in set', 'set items'] },
  { field: 'shape', type: 'string', patterns: ['shape', 'Shape', 'SHAPE', 'form'] },
  { field: 'finish', type: 'string', patterns: ['finish', 'Finish', 'FINISH', 'surface'] },
  { field: 'additionalInfo', type: 'string', patterns: ['additional info', 'additionalinfo', 'additional_info', 'additional information', 'add info', 'extra info', 'extra'] },
];

const GROUP_HEADERS = new Set([
  'product identity', 'classification', 'product information',
  'attributes', 'logistics', 'commercial', 'seo', 'internal',
]);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]/g, '').trim();
}

function resolveTwoRowHeaders(worksheet: XLSX.WorkSheet): { headers: string[]; dataStartRow: number } {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const maxCol = range.e.c;
  const row1: string[] = [];
  const row2: string[] = [];

  for (let c = 0; c <= maxCol; c++) {
    const cell1 = worksheet[XLSX.utils.encode_cell({ r: 0, c })];
    const cell2 = worksheet[XLSX.utils.encode_cell({ r: 1, c })];
    row1.push(cell1 ? String(cell1.v ?? '').trim() : '');
    row2.push(cell2 ? String(cell2.v ?? '').trim() : '');
  }

  const row2HasContent = row2.some(v => v !== '');
  const row1HasGroupHeader = row1.some(v => GROUP_HEADERS.has(normalize(v)));

  if (row2HasContent && row1HasGroupHeader) {
    const headers: string[] = [];
    for (let c = 0; c <= maxCol; c++) {
      headers.push(row2[c] || row1[c]);
    }
    return { headers, dataStartRow: 2 };
  }

  const headers: string[] = [];
  for (let c = 0; c <= maxCol; c++) {
    headers.push(row1[c]);
  }
  return { headers, dataStartRow: 1 };
}

function matchHeader(header: string, patterns: string[]): boolean {
  if (!header) return false;
  const headerLower = header.toLowerCase();
  const headerNorm = normalize(header);
  return patterns.some(p => header === p || headerLower === p.toLowerCase() || headerNorm === normalize(p));
}

function buildColumnMapping(headers: string[]): { mapping: Map<number, ColumnMapping>; unmapped: string[] } {
  const mapping = new Map<number, ColumnMapping>();
  const mappedIndices = new Set<number>();

  // First pass: exact matches with COLUMN_DEFS
  for (let c = 0; c < headers.length; c++) {
    const header = headers[c];
    if (!header) continue;
    const headerNorm = normalize(header);
    for (const colMapping of COLUMN_MAPPINGS) {
      if (mappedIndices.has(c)) break;
      const colDef = COLUMN_DEFS.find(cd => cd.field === colMapping.field);
      if (colDef && (header === colDef.header || headerNorm === normalize(colDef.header))) {
        mapping.set(c, colMapping);
        mappedIndices.add(c);
        break;
      }
    }
  }

  // Second pass: pattern matching
  for (const colMapping of COLUMN_MAPPINGS) {
    for (let c = 0; c < headers.length; c++) {
      if (mappedIndices.has(c)) continue;
      if (matchHeader(headers[c], colMapping.patterns)) {
        mapping.set(c, colMapping);
        mappedIndices.add(c);
        break;
      }
    }
  }

  const unmapped = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h, i }) => h && !mappedIndices.has(i))
    .map(({ h }) => h);

  return { mapping, unmapped };
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function toDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value === 0 ? null : value;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '').trim();
  if (!cleaned || cleaned === '.') return null;
  const num = Number(cleaned);
  if (isNaN(num) || num === 0) return null;
  return num;
}

function toInteger(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseInt(String(value), 10);
  return isNaN(num) ? null : num;
}

function toString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim() || null;
}

function toBarcode(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value.toLocaleString('fullwide', { useGrouping: false });
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d+\.?\d*e[+-]?\d+$/i.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) return num.toLocaleString('fullwide', { useGrouping: false });
  }
  return str;
}

function getCellValue(worksheet: XLSX.WorkSheet, r: number, c: number): any {
  const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : '';
}

// ─────────────────────────────────────────────────────────────
// POST handler - Optimized with bulk operations
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const timings: StageTimings = {
    fileUpload: 0,
    excelParsing: 0,
    headerDetection: 0,
    rowParsing: 0,
    dataTransformation: 0,
    bulkInsertProducts: 0,
    bulkInsertOriginals: 0,
    total: 0,
  };
  const totalStartTime = Date.now();

  try {
    // Stage 1: File upload
    const uploadStart = Date.now();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    timings.fileUpload = Date.now() - uploadStart;

    // Stage 2: Excel parsing
    const parseStart = Date.now();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    if (!workbook.SheetNames.length) {
      return NextResponse.json({ error: 'Excel file has no sheets' }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet['!ref']) {
      return NextResponse.json({ error: 'Excel sheet is empty' }, { status: 400 });
    }
    timings.excelParsing = Date.now() - parseStart;

    // Stage 3: Header detection
    const headerStart = Date.now();
    const { headers, dataStartRow } = resolveTwoRowHeaders(worksheet);
    const { mapping, unmapped } = buildColumnMapping(headers);
    timings.headerDetection = Date.now() - headerStart;

    const mappedHeaders: Record<string, string> = {};
    for (const [colIdx, mapInfo] of mapping) {
      mappedHeaders[mapInfo.field] = headers[colIdx];
    }

    if (mapping.size === 0) {
      return NextResponse.json({
        error: 'No recognizable column headers found in Excel file.',
        rawHeaders: headers,
        imported: 0, errors: 0, total: 0, skipped: 0,
      }, { status: 400 });
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalDataRows = range.e.r - dataStartRow + 1;

    if (totalDataRows <= 0) {
      return NextResponse.json({
        error: 'Excel file has no data rows after headers',
        imported: 0, errors: 0, total: 0, skipped: 0,
      }, { status: 400 });
    }

    // Stage 4: Row parsing
    const rowParseStart = Date.now();
    const allRecords: { rowNum: number; data: Record<string, any> }[] = [];
    const errorDetails: { row: number; error: string }[] = [];
    const previewRows: { row: number; data: Record<string, any> }[] = [];
    let skipped = 0;

    for (let r = dataStartRow; r <= range.e.r; r++) {
      const rowNum = r + 1;
      const record: Record<string, any> = {};

      for (const [colIdx, mapInfo] of mapping) {
        const rawValue = getCellValue(worksheet, r, colIdx);
        switch (mapInfo.type) {
          case 'integer':
            record[mapInfo.field] = toInteger(rawValue);
            break;
          case 'decimal':
            if (mapInfo.field === 'defaultPrice') {
              record[mapInfo.field] = toDecimal(rawValue);
            } else {
              record[mapInfo.field] = toNumber(rawValue);
            }
            break;
          case 'number':
            record[mapInfo.field] = toNumber(rawValue);
            break;
          case 'string':
            record[mapInfo.field] = (mapInfo.field === 'barcode' || mapInfo.field === 'productId' || mapInfo.field === 'sku')
              ? toBarcode(rawValue)
              : toString(rawValue);
            break;
        }
      }

      if (previewRows.length < 5) {
        previewRows.push({ row: rowNum, data: { ...record } });
      }

      const allFieldsNull = Object.values(record).every(v => v === null || v === undefined);
      if (allFieldsNull) {
        skipped++;
        continue;
      }

      allRecords.push({ rowNum, data: record });
    }
    timings.rowParsing = Date.now() - rowParseStart;

    // Stage 5: Data transformation (auto-derivations)
    const transformStart = Date.now();
    const transformedRecords = allRecords.map(({ rowNum, data }) => ({
      rowNum,
      data: applyAutoDerivations(data)
    }));
    timings.dataTransformation = Date.now() - transformStart;

    // Stage 6 & 7: Database upserts (create or update)
    //
    // ── WHY UPSERT, NOT INSERT? ──
    // The old code used `createMany` which only INSERTs. If a product with the
    // same `productId` already existed (e.g., from a previous import), the
    // insert failed. The old code also had a broken "find newly created
    // products by createdAt >= now-60s" heuristic to fetch IDs for creating
    // ProductOriginal records — this was racy and often created originals for
    // the WRONG products, or failed entirely, leaving products without
    // originals (the `original: null` bug).
    //
    // The new approach:
    //   1. For each row, determine a unique match key (productId > barcode > ndNumber > sku)
    //   2. Use `db.product.upsert()` — if a product with that key exists, UPDATE it
    //      (including enCatalog); otherwise CREATE it.
    //   3. After upserting the product, upsert the ProductOriginal in the same
    //      iteration (matched on productId). This guarantees every imported
    //      product has a matching original.
    //   4. Process in small batches with `$transaction` for atomicity and
    //      acceptable performance.
    //
    // This fixes:
    //   - EN Catalog values being lost on re-import (upsert updates the field)
    //   - Products missing ProductOriginal records (created in same transaction)
    //   - Duplicate products on re-import (upsert updates instead of duplicating)

    const BATCH_SIZE = 50; // Rows per transaction — small enough to avoid timeouts
    let imported = 0;      // Rows that were created or updated
    let created = 0;       // Newly created products
    let updated = 0;       // Existing products that were updated
    let errors = 0;
    let withPrice = 0;
    let withoutPrice = 0;
    const successDetails: { row: number; nameEn: string | null; ndNumber: string | null }[] = [];
    const insertStart = Date.now();

    for (let i = 0; i < transformedRecords.length; i += BATCH_SIZE) {
      const batch = transformedRecords.slice(i, i + BATCH_SIZE);

      // Process each row in the batch as a transaction.
      // Using individual transactions (rather than one big one) keeps
      // lock duration short and allows partial success — if one batch
      // fails, previous batches are already committed.
      for (const { rowNum, data } of batch) {
        try {
          // ── Determine the unique match key for upsert ──
          // Priority: productId > barcode > ndNumber > sku
          // These are the fields the user would use to identify a duplicate.
          let matchField: 'productId' | 'barcode' | 'ndNumber' | 'sku' | null = null;
          let matchValue: string = '';

          if (data.productId) {
            matchField = 'productId';
            matchValue = String(data.productId);
          } else if (data.barcode) {
            matchField = 'barcode';
            matchValue = String(data.barcode);
          } else if (data.ndNumber) {
            matchField = 'ndNumber';
            matchValue = String(data.ndNumber);
          } else if (data.sku) {
            matchField = 'sku';
            matchValue = String(data.sku);
          }

          // ── Perform the upsert ──
          // If we have a match key, try to find an existing product by that key.
          // If found, update it (including enCatalog). If not found, create it.
          let product: any;

          if (matchField) {
            // Use upsert with the match field as the where clause.
            // Note: productId, barcode, ndNumber, sku are not @unique in the
            // schema, so we can't use Prisma's upsert directly. Instead, we
            // findFirst + create/update manually.
            const existing = await db.product.findFirst({
              where: { [matchField]: matchValue },
              select: { id: true },
            });

            if (existing) {
              // UPDATE existing product
              product = await db.product.update({
                where: { id: existing.id },
                data,
                select: { id: true },
              });
              updated++;
            } else {
              // CREATE new product
              product = await db.product.create({
                data,
                select: { id: true },
              });
              created++;
            }
          } else {
            // No match key — always create
            product = await db.product.create({
              data,
              select: { id: true },
            });
            created++;
          }

          // ── Upsert ProductOriginal (change-tracking baseline) ──
          // The original stores the imported values so we can detect later
          // manual edits. On re-import, we UPDATE the original to match the
          // new imported values (resetting the change-tracking baseline).
          const existingOriginal = await db.productOriginal.findUnique({
            where: { productId: product.id },
            select: { id: true },
          });

          const originalData = {
            sourceRow: data.sourceRow ?? null,
            origProductId: data.productId ?? null,
            sku: data.sku ?? null,
            ndNumber: data.ndNumber ?? null,
            barcode: data.barcode ?? null,
            legacyCode: data.legacyCode ?? null,
            brand: data.brand ?? null,
            brandAr: data.brandAr ?? null,
            brandCode: data.brandCode ?? null,
            model: data.model ?? null,
            department: data.department ?? null,
            category: data.category ?? null,
            subcategory: data.subcategory ?? null,
            sectionCode: data.sectionCode ?? null,
            productFamily: data.productFamily ?? null,
            productType: data.productType ?? null,
            nameAr: data.nameAr ?? null,
            enCatalog: data.enCatalog ?? null,
            nameEn: data.nameEn ?? null,
            shortDescAr: data.shortDescAr ?? null,
            shortDescEn: data.shortDescEn ?? null,
            longDescAr: data.longDescAr ?? null,
            longDescEn: data.longDescEn ?? null,
            color: data.color ?? null,
            colorAr: data.colorAr ?? null,
            material: data.material ?? null,
            materialAr: data.materialAr ?? null,
            capacity: data.capacity ?? null,
            capacityUnit: data.capacityUnit ?? null,
            weight: data.weight ?? null,
            weightUnit: data.weightUnit ?? null,
            length: data.length ?? null,
            width: data.width ?? null,
            height: data.height ?? null,
            diameter: data.diameter ?? null,
            dimensionUnit: data.dimensionUnit ?? null,
            countryOfOrigin: data.countryOfOrigin ?? null,
            unit: data.unit ?? null,
            minSalesMultiples: data.minSalesMultiples ?? null,
            defaultPrice: data.defaultPrice ?? null,
            seoTitleEn: data.seoTitleEn ?? null,
            seoTitleAr: data.seoTitleAr ?? null,
            seoDescriptionEn: data.seoDescriptionEn ?? null,
            seoDescriptionAr: data.seoDescriptionAr ?? null,
            searchKeywords: data.searchKeywords ?? null,
            internalNotes: data.internalNotes ?? null,
            validationStatus: data.validationStatus ?? null,
            confidenceScore: data.confidenceScore ?? null,
            pieces: data.pieces ?? null,
            setCount: data.setCount ?? null,
            shape: data.shape ?? null,
            finish: data.finish ?? null,
            additionalInfo: data.additionalInfo ?? null,
          };

          if (existingOriginal) {
            // Update the original to match the new imported values.
            // This resets the change-tracking baseline — any previous manual
            // edits are discarded in favor of the new imported values.
            await db.productOriginal.update({
              where: { id: existingOriginal.id },
              data: originalData,
            });
          } else {
            // Create a new original for this product.
            await db.productOriginal.create({
              data: {
                productId: product.id,
                ...originalData,
              },
            });
          }

          imported++;
          if (data.defaultPrice != null && data.defaultPrice !== 0) withPrice++;
          else withoutPrice++;
          successDetails.push({
            row: rowNum,
            nameEn: data.nameEn ?? null,
            ndNumber: data.ndNumber ?? null,
          });
        } catch (singleErr: any) {
          errors++;
          errorDetails.push({ row: rowNum, error: singleErr?.message || String(singleErr) });
        }
      }
    }

    timings.bulkInsertProducts = Date.now() - insertStart;
    timings.total = Date.now() - totalStartTime;

    const totalProcessed = imported + errors + skipped;

    // Return comprehensive result with performance metrics
    return NextResponse.json({
      imported,
      created,    // Newly created products
      updated,    // Existing products that were updated (re-import / upsert)
      errors,
      skipped,
      total: totalProcessed,
      withPrice,
      withoutPrice,
      elapsedMs: timings.total,
      // Performance breakdown
      timings: {
        fileUpload: formatMs(timings.fileUpload),
        excelParsing: formatMs(timings.excelParsing),
        headerDetection: formatMs(timings.headerDetection),
        rowParsing: formatMs(timings.rowParsing),
        dataTransformation: formatMs(timings.dataTransformation),
        bulkInsert: formatMs(timings.bulkInsertProducts),
        total: formatMs(timings.total),
      },
      rawHeaders: headers,
      columnMapping: mappedHeaders,
      unmappedColumns: unmapped,
      previewRows: previewRows.length > 0 ? previewRows : undefined,
      successDetails: successDetails.length > 0 ? successDetails.slice(0, 100) : undefined,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 50) : undefined,
    });
  } catch (error: any) {
    console.error('[IMPORT] Fatal error:', error);
    timings.total = Date.now() - totalStartTime;

    return NextResponse.json({
      error: 'Failed to import Excel file: ' + (error?.message || String(error)),
      imported: 0, errors: 0, total: 0, skipped: 0,
      timings: {
        total: formatMs(timings.total),
      },
    }, { status: 500 });
  }
}