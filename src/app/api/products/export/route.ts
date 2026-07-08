import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS, COLUMN_GROUPS, resolveImageLinks, resolveVariants } from '@/lib/lookups';
import * as XLSX from 'xlsx-js-style';

// Excel export fetches ALL products and builds a workbook in memory — can take
// 10-20s for 2,500+ products. Request max duration for Vercel.
export const maxDuration = 300;
export const runtime = 'nodejs';

/**
 * Excel Export Route — Al-Nassim Master Catalog 52-Column Schema
 * 
 * Features:
 *   - Two-row header format (group headers + column headers)
 *   - Red font highlighting for manually modified fields (change tracking)
 *   - Original imported values compared against current values
 *   - Variant Groups worksheet for variant relationships
 *
 * Export format:
 *   Row 1: Group headers (merged cells spanning their column ranges)
 *     - Product Identity (cols 0–9, 10 cols)
 *     - Classification (cols 10–15, 6 cols)
 *     - Product Information (cols 16–21, 6 cols)
 *     - Attributes (cols 22–34, 13 cols)
 *     - Logistics (cols 35–37, 3 cols)
 *     - Commercial (col 38, 1 col)
 *     - SEO (cols 39–43, 5 cols)
 *     - Internal (cols 44–51, 8 cols)
 *     - Media (col 52, 1 col — Image Links)
 *   Row 2: Actual column headers from COLUMN_DEFS
 *   Row 3+: Data rows
 */

// Column widths for each of the 53 columns (52 original + 1 Image Links)
const COL_WIDTHS = [
  // Product Identity (10)
  10, 14, 14, 14, 16, 12, 18, 16, 10, 14,
  // Classification (6)
  22, 20, 20, 12, 18, 18,
  // Product Information (6)
  30, 30, 28, 28, 30, 30,
  // Attributes (13)
  12, 14, 16, 16, 10, 12, 10, 10, 8, 8, 8, 10, 12,
  // Logistics (3)
  18, 8, 16,
  // Commercial (1)
  14,
  // SEO (5)
  30, 30, 35, 35, 30,
  // Internal (8)
  24, 16, 14, 8, 10, 14, 14, 22,
  // Media (1) — Image Links (newline-separated URLs, needs a wide column)
  50,
  // Media (1) — Variants (newline-separated ND Numbers or barcodes)
  30,
];

// Fields that should be compared for change detection
const TRACKED_FIELDS = new Set([
  'productId', 'sku', 'ndNumber', 'barcode', 'legacyCode', 'brand', 'model',
  'department', 'category', 'subcategory', 'productFamily', 'productType',
  'nameAr', 'nameEn', 'shortDescAr', 'shortDescEn', 'longDescAr', 'longDescEn',
  'color', 'material', 'capacity', 'capacityUnit', 'weight', 'weightUnit',
  'length', 'width', 'height', 'diameter', 'dimensionUnit',
  'countryOfOrigin', 'unit', 'minSalesMultiples', 'defaultPrice',
  'seoTitleEn', 'seoTitleAr', 'seoDescriptionEn', 'seoDescriptionAr', 'searchKeywords',
  'internalNotes', 'validationStatus', 'confidenceScore', 'pieces', 'setCount', 'shape', 'finish', 'additionalInfo',
]);

/**
 * Check if a field value has been modified from its original imported value
 */
function isFieldModified(product: any, field: string): boolean {
  if (!product.original || !TRACKED_FIELDS.has(field)) return false;
  
  const currentValue = product[field];
  // For productId field, compare against origProductId in the original record
  const originalValue = field === 'productId' ? product.original.origProductId : product.original[field];
  
  // Normalize values for comparison
  const currentStr = currentValue == null ? '' : String(currentValue).trim();
  const originalStr = originalValue == null ? '' : String(originalValue).trim();
  
  return currentStr !== originalStr;
}

/**
 * Create styled cell - red font for modified values.
 *
 * SAFETY NET: Excel cells have a hard limit of 32,767 characters. Any value
 * longer than that would throw "Error: Text length must not exceed 32767
 * characters" and crash the entire export. We truncate to 32,767 chars as a
 * defense-in-depth measure — even if a field somehow contains a huge string
 * (e.g. a base64 data URL that slipped through resolveImageLinks), the export
 * still succeeds instead of failing with a 500.
 */
const EXCEL_CELL_MAX_CHARS = 32767;

function createStyledCell(value: any, isModified: boolean): XLSX.CellObject {
  let cellValue = value === null || value === undefined || value === '' ? '' : value;

  // Truncate to Excel's cell limit (32767 chars). Append an ellipsis marker
  // so the user can see the value was truncated.
  if (typeof cellValue === 'string' && cellValue.length > EXCEL_CELL_MAX_CHARS) {
    cellValue = cellValue.slice(0, EXCEL_CELL_MAX_CHARS - 20) + '... [truncated]';
  }

  const cell: XLSX.CellObject = {
    t: typeof cellValue === 'number' ? 'n' : 's',
    v: cellValue,
    s: isModified ? {
      font: {
        color: { rgb: 'FF0000' },  // Red font for modified cells
      },
    } : undefined,
  };

  return cell;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceRowFrom = searchParams.get('sourceRowFrom');
    const sourceRowTo = searchParams.get('sourceRowTo');

    const where: any = {};
    if (sourceRowFrom !== null && sourceRowTo !== null) {
      const from = Number(sourceRowFrom);
      const to = Number(sourceRowTo);
      if (isNaN(from) || isNaN(to)) {
        return NextResponse.json({ error: 'Invalid range format.' }, { status: 400 });
      }
      if (from > to) {
        return NextResponse.json({ error: 'Invalid range: start > end.' }, { status: 400 });
      }
      where.sourceRow = { gte: from, lte: to };
    }

    // Include original values for change tracking comparison
    const data = await db.product.findMany({
      where,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: { include: { variantGroup: true } },
      },
      orderBy: { sourceRow: 'asc' },
    });

    const workbook = XLSX.utils.book_new();
    
    // ── MASTER CATALOG SHEET ──
    const worksheet: XLSX.WorkSheet = {};
    const totalCols = COLUMN_DEFS.length; // 52
    const totalRows = data.length;
    const maxRow = totalRows + 2; // +2 for two header rows

    // ── Row 1: Group headers (merged cells) ──
    const merges: XLSX.Range[] = [];
    let colOffset = 0;
    for (const group of COLUMN_GROUPS) {
      const span = group.fields.length;
      // Write group name in first column of the span
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colOffset });
      worksheet[cellRef] = { t: 's', v: group.name, s: { font: { bold: true } } };

      if (span > 1) {
        merges.push({
          s: { r: 0, c: colOffset },
          e: { r: 0, c: colOffset + span - 1 },
        });
      }
      colOffset += span;
    }

    // ── Row 2: Actual column headers from COLUMN_DEFS ──
    for (let c = 0; c < totalCols; c++) {
      const colDef = COLUMN_DEFS[c];
      const cellRef = XLSX.utils.encode_cell({ r: 1, c });
      worksheet[cellRef] = { t: 's', v: colDef.header, s: { font: { bold: true } } };
    }

    // ── Row 3+: Data rows (with red highlighting for modified cells) ──
    for (let r = 0; r < totalRows; r++) {
      const product = data[r] as any;
      for (let c = 0; c < totalCols; c++) {
        const colDef = COLUMN_DEFS[c];
        const cellRef = XLSX.utils.encode_cell({ r: r + 2, c });

        // The "imageLinks" and "variants" fields are NOT direct Prisma product
        // fields — they're derived from relations. Resolve them specially.
        // All other fields are read directly from the product object.
        const value = colDef.field === 'imageLinks'
          ? resolveImageLinks(product)
          : colDef.field === 'variants'
            ? resolveVariants(product, data)
            : product[colDef.field];
        const isModified = isFieldModified(product, colDef.field);

        worksheet[cellRef] = createStyledCell(value, isModified);
      }
    }

    // Set sheet range
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(maxRow - 1, 1), c: totalCols - 1 },
    });

    // Apply merges for group headers
    worksheet['!merges'] = merges;

    // Set column widths
    worksheet['!cols'] = COL_WIDTHS.map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Catalog');

    // ── VARIANT GROUPS SHEET ──
    // Create a worksheet for variant relationships if any exist
    const variantData: any[] = [];
    for (const product of data) {
      if (product.variantMemberships && product.variantMemberships.length > 0) {
        for (const membership of product.variantMemberships) {
          variantData.push({
            'Variant Group ID': membership.variantGroupId,
            'Primary Product ID': membership.variantGroup.primaryProductId,
            'Variant Product ID': product.productId,
            'Variant Color': membership.color || '',
            'Variant Color AR': membership.colorAr || '',
            'Variant Image': membership.variantImage || '',
            'Variant Notes': membership.variantNotes || '',
          });
        }
      }
    }

    if (variantData.length > 0) {
      const variantWorksheet = XLSX.utils.json_to_sheet(variantData, { header: [
        'Variant Group ID', 'Primary Product ID', 'Variant Product ID',
        'Variant Color', 'Variant Color AR', 'Variant Image', 'Variant Notes'
      ]});
      
      // Set column widths for variant sheet
      variantWorksheet['!cols'] = [
        { wch: 20 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 24 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, variantWorksheet, 'Variant Groups');
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="alnassim_catalog_export.xlsx"',
      },
    });
  } catch (error: any) {
    // COMPREHENSIVE ERROR LOGGING — do not return only HTTP 500.
    // Log: error message, stack trace, request parameters, and Prisma query
    // context so the root cause can be diagnosed without reproducing.
    const { searchParams } = new URL(request.url);
    const sourceRowFrom = searchParams.get('sourceRowFrom');
    const sourceRowTo = searchParams.get('sourceRowTo');
    const whereClause = (sourceRowFrom !== null && sourceRowTo !== null)
      ? { sourceRow: { gte: Number(sourceRowFrom), lte: Number(sourceRowTo) } }
      : {};

    console.error('═══════════════════════════════════════════════════════════');
    console.error('  /api/products/export — FAILED');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`  Error message: ${error?.message || 'Unknown error'}`);
    console.error(`  Error name:    ${error?.name || 'Error'}`);
    console.error(`  Request params:`, {
      sourceRowFrom,
      sourceRowTo,
      where: whereClause,
    });
    console.error(`  Prisma query context:`, {
      model: 'product',
      operation: 'findMany',
      include: ['images', 'original', 'variantMemberships'],
      orderBy: { sourceRow: 'asc' },
      where: whereClause,
    });
    if (error?.stack) {
      console.error('  Stack trace:');
      error.stack.split('\n').forEach((line: string) => console.error(`    ${line}`));
    }
    console.error('═══════════════════════════════════════════════════════════');

    // Return a detailed error response (not just "Failed to export Excel file")
    // so the client can see what went wrong without checking server logs.
    return NextResponse.json({
      error: 'Failed to export Excel file',
      details: error?.message || 'Unknown error',
      requestParams: { sourceRowFrom, sourceRowTo },
    }, { status: 500 });
  }
}