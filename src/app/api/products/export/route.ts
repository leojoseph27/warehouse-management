import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS, COLUMN_GROUPS, resolveImageLinks, resolveVariants, type ColumnDef } from '@/lib/lookups';
import * as XLSX from 'xlsx-js-style';
import ExcelJS from 'exceljs';

// Excel export fetches ALL products and builds a workbook in memory — can take
// 10-20s for 2,500+ products, or longer when embedding images. Request the
// maximum allowed duration for Vercel.
export const maxDuration = 300;
export const runtime = 'nodejs';

/**
 * GET /api/products/export
 *
 * Two export modes (selected via query params):
 *
 * 1. Excel Only (default)
 *    - Exports product data without images
 *    - Uses xlsx-js-style for the two-row header format (group + column)
 *    - Red font highlighting for modified fields
 *    - Fast, small file size
 *
 * 2. Excel with Images (?embedImages=true)
 *    - First column contains the product's primary image (embedded, not linked)
 *    - Uses exceljs which supports image embedding via addImage()
 *    - Row heights and column widths auto-adjust for image visibility
 *    - Same column selection, filters, and ordering as Excel Only
 *
 * Shared query params (both modes):
 *   - srFrom, srTo: source row range filter
 *   - sourceRowMin, sourceRowMax: alias for srFrom/srTo (same as /api/products)
 *   - columns: comma-separated field names to include (default: all)
 *     Example: ?columns=productId,nameEn,brand,defaultPrice
 *
 * The export uses the same COLUMN_DEFS, dataset, filtering, and ordering as
 * the PDF Report and Print Preview, ensuring consistent output across all
 * export types.
 */

// Fields tracked for change detection (same as Excel export + PDF report)
const TRACKED_FIELDS = new Set([
  'productId', 'sku', 'ndNumber', 'barcode', 'legacyCode', 'brand', 'model',
  'department', 'category', 'subcategory', 'productFamily', 'productType',
  'nameAr', 'enCatalog', 'nameEn', 'shortDescAr', 'shortDescEn', 'longDescAr', 'longDescEn',
  'color', 'material', 'capacity', 'capacityUnit', 'weight', 'weightUnit',
  'length', 'width', 'height', 'diameter', 'dimensionUnit',
  'countryOfOrigin', 'unit', 'minSalesMultiples', 'defaultPrice',
  'seoTitleEn', 'seoTitleAr', 'seoDescriptionEn', 'seoDescriptionAr', 'searchKeywords',
  'internalNotes', 'validationStatus', 'confidenceScore', 'pieces', 'setCount', 'shape', 'finish', 'additionalInfo',
]);

function isFieldModified(product: any, field: string): boolean {
  if (!product.original || !TRACKED_FIELDS.has(field)) return false;
  const currentValue = product[field];
  const originalValue = field === 'productId' ? product.original.origProductId : product.original[field];
  const currentStr = currentValue == null ? '' : String(currentValue).trim();
  const originalStr = originalValue == null ? '' : String(originalValue).trim();
  return currentStr !== originalStr;
}

const EXCEL_CELL_MAX_CHARS = 32767;

function createStyledCell(value: any, isModified: boolean): XLSX.CellObject {
  let cellValue = value === null || value === undefined || value === '' ? '' : value;
  if (typeof cellValue === 'string' && cellValue.length > EXCEL_CELL_MAX_CHARS) {
    cellValue = cellValue.slice(0, EXCEL_CELL_MAX_CHARS - 20) + '... [truncated]';
  }
  const cell: XLSX.CellObject = {
    t: typeof cellValue === 'number' ? 'n' : 's',
    v: cellValue,
    s: isModified ? {
      font: { color: { rgb: 'FF0000' } },
    } : undefined,
  };
  return cell;
}

/** Get the primary image URL for a product (same logic as print-report). */
function getPrimaryImageUrl(product: any): string | null {
  if (!product.images || product.images.length === 0) return null;
  const sorted = [...product.images].sort((a: any, b: any) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
  const img = sorted[0];
  if (img.driveFileId) {
    return `https://drive.google.com/thumbnail?id=${img.driveFileId}&sz=w400`;
  }
  if (img.thumbnailUrl) return img.thumbnailUrl;
  if (img.imageUrl) return img.imageUrl;
  return null;
}

/** Fetch an image URL and return a Buffer. Returns null on failure. */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image/jpeg') && !contentType.includes('image/png') && !contentType.includes('image/jpg')) {
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/** Resolve a cell value for a given product + column def. */
function resolveCellValue(product: any, def: ColumnDef, allProducts: any[]): any {
  if (def.field === 'imageLinks') return resolveImageLinks(product);
  if (def.field === 'variants') return resolveVariants(product, allProducts);
  return product[def.field];
}

/** Parse the columns query param into a filtered list of ColumnDef. */
function resolveColumns(columnsParam: string | null): ColumnDef[] {
  if (!columnsParam || !columnsParam.trim()) return COLUMN_DEFS;
  const requestedFields = columnsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (requestedFields.length === 0) return COLUMN_DEFS;
  const filtered = COLUMN_DEFS.filter((d) => requestedFields.includes(d.field));
  return filtered.length > 0 ? filtered : COLUMN_DEFS;
}

/** Build the where clause from srFrom/srTo or sourceRowMin/sourceRowMax. */
function buildWhereClause(searchParams: URLSearchParams): any {
  const where: any = {};
  const srFrom = searchParams.get('srFrom');
  const srTo = searchParams.get('srTo');
  const sourceRowMin = searchParams.get('sourceRowMin');
  const sourceRowMax = searchParams.get('sourceRowMax');

  const from = srFrom ? Number(srFrom) : (sourceRowMin ? Number(sourceRowMin) : NaN);
  const to = srTo ? Number(srTo) : (sourceRowMax ? Number(sourceRowMax) : NaN);

  if (!isNaN(from) && !isNaN(to) && from <= to) {
    where.sourceRow = { gte: from, lte: to };
  }
  return where;
}

// ─────────────────────────────────────────────────────────────────
// MODE 1: Excel Only (xlsx-js-style) — no images
// ─────────────────────────────────────────────────────────────────
async function exportExcelOnly(data: any[], cols: ColumnDef[]): Promise<Buffer> {
  const workbook = XLSX.utils.book_new();
  const worksheet: XLSX.WorkSheet = {};
  const totalCols = cols.length;
  const totalRows = data.length;
  const maxRow = totalRows + 2;

  // Row 1: Group headers (merged cells)
  const merges: XLSX.Range[] = [];
  let colOffset = 0;

  // Build group headers based on the selected columns (only include groups
  // that have at least one selected column)
  const activeGroups = COLUMN_GROUPS
    .map((group) => ({
      name: group.name,
      fields: group.fields.filter((f) => cols.some((c) => c.field === f.field)),
    }))
    .filter((g) => g.fields.length > 0);

  for (const group of activeGroups) {
    const span = group.fields.length;
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: colOffset });
    worksheet[cellRef] = { t: 's', v: group.name, s: { font: { bold: true } } };
    if (span > 1) {
      merges.push({ s: { r: 0, c: colOffset }, e: { r: 0, c: colOffset + span - 1 } });
    }
    colOffset += span;
  }

  // Row 2: Column headers
  for (let c = 0; c < totalCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c });
    worksheet[cellRef] = { t: 's', v: cols[c].header, s: { font: { bold: true } } };
  }

  // Row 3+: Data rows
  for (let r = 0; r < totalRows; r++) {
    const product = data[r];
    for (let c = 0; c < totalCols; c++) {
      const def = cols[c];
      const cellRef = XLSX.utils.encode_cell({ r: r + 2, c });
      const value = resolveCellValue(product, def, data);
      const isModified = isFieldModified(product, def.field);
      worksheet[cellRef] = createStyledCell(value, isModified);
    }
  }

  worksheet['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(maxRow - 1, 1), c: totalCols - 1 },
  });
  worksheet['!merges'] = merges;
  worksheet['!cols'] = cols.map((def) => {
    // Set reasonable column widths based on header length
    const w = Math.max(10, Math.min(40, def.header.length + 5));
    return { wch: w };
  });

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Catalog');

  // Variant Groups sheet (only if variant memberships exist)
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
    const variantWorksheet = XLSX.utils.json_to_sheet(variantData, {
      header: ['Variant Group ID', 'Primary Product ID', 'Variant Product ID',
        'Variant Color', 'Variant Color AR', 'Variant Image', 'Variant Notes'],
    });
    variantWorksheet['!cols'] = [
      { wch: 20 }, { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(workbook, variantWorksheet, 'Variant Groups');
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// ─────────────────────────────────────────────────────────────────
// MODE 2: Excel with Images (exceljs) — embedded primary images
// ─────────────────────────────────────────────────────────────────
async function exportExcelWithImages(data: any[], cols: ColumnDef[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Master Catalog', {
    views: [{ state: 'frozen', ySplit: 2 }], // freeze the 2 header rows
  });

  // Define columns: first column is the image, rest are selected fields
  const imageColHeader: Partial<ExcelJS.Column> = {
    header: 'Image',
    key: '_image',
    width: 14, // ~100px wide
  };
  const dataColHeaders: Partial<ExcelJS.Column>[] = cols.map((def) => ({
    header: def.header,
    key: def.field,
    width: Math.max(10, Math.min(40, def.header.length + 5)),
  }));

  sheet.columns = [imageColHeader, ...dataColHeaders];

  // Row 1: Group headers (merged cells)
  // Build active groups based on selected columns
  const activeGroups = COLUMN_GROUPS
    .map((group) => ({
      name: group.name,
      fields: group.fields.filter((f) => cols.some((c) => c.field === f.field)),
    }))
    .filter((g) => g.fields.length > 0);

  // Insert a row at the top for group headers
  sheet.spliceRows(1, 0, []);
  let groupColOffset = 1; // start at column 2 (column 1 is the image column)
  for (const group of activeGroups) {
    const span = group.fields.length;
    const startCol = groupColOffset;
    const endCol = groupColOffset + span - 1;
    const cell = sheet.getCell(1, startCol);
    cell.value = group.name;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (span > 1) {
      sheet.mergeCells(1, startCol, 1, endCol);
    }
    groupColOffset = endCol + 1;
  }

  // The image column header on row 1 (merge rows 1-2 for the image column)
  const imageHeaderCell = sheet.getCell(1, 1);
  imageHeaderCell.value = 'Image';
  imageHeaderCell.font = { bold: true };
  imageHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(1, 1, 2, 1);

  // Row 2: Column headers (already set by sheet.columns, but style them)
  for (let c = 0; c <= cols.length; c++) {
    const cell = sheet.getCell(2, c + 1);
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
  }

  // Add data rows (row 3+)
  for (let r = 0; r < data.length; r++) {
    const product = data[r];
    const row = sheet.getRow(r + 3);
    row.height = 60; // tall enough for a 50px image

    // Set cell values for each selected column (column 1 is image, data starts at column 2)
    for (let c = 0; c < cols.length; c++) {
      const def = cols[c];
      const value = resolveCellValue(product, def, data);
      const cell = row.getCell(c + 2); // +2 because column 1 is image, ExcelJS is 1-indexed
      const strValue = value == null ? '' : String(value);

      // Truncate very long values
      cell.value = strValue.length > EXCEL_CELL_MAX_CHARS
        ? strValue.slice(0, EXCEL_CELL_MAX_CHARS - 20) + '... [truncated]'
        : strValue;

      cell.alignment = { vertical: 'middle', wrapText: false };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };

      // Red font for modified fields
      if (isFieldModified(product, def.field)) {
        cell.font = { color: { argb: 'FFFF0000' }, bold: true };
      }

      // Alternate row background
      if (r % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      }
    }

    // Image cell border + background
    const imageCell = row.getCell(1);
    imageCell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
    if (r % 2 === 1) {
      imageCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' },
      };
    }
  }

  // Pre-fetch all primary images in parallel (with concurrency limit)
  const CONCURRENCY = 10;
  const imageBuffers: (Buffer | null)[] = new Array(data.length).fill(null);
  for (let i = 0; i < data.length; i += CONCURRENCY) {
    const batch = data.slice(i, i + CONCURRENCY);
    const buffers = await Promise.all(
      batch.map(async (product) => {
        const url = getPrimaryImageUrl(product);
        if (!url) return null;
        return fetchImageBuffer(url);
      })
    );
    for (let j = 0; j < buffers.length; j++) {
      imageBuffers[i + j] = buffers[j];
    }
  }

  // Embed images into the first column
  for (let r = 0; r < data.length; r++) {
    const imgBuffer = imageBuffers[r];
    if (!imgBuffer) continue;

    try {
      // Detect extension from buffer magic bytes
      const isPng = imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50;
      const ext = isPng ? 'png' : 'jpeg';
      // exceljs accepts a Buffer or Uint8Array for the buffer property.
      // We cast to any to avoid a TypeScript mismatch between Node.js Buffer
      // types (Buffer<ArrayBufferLike> vs Buffer<ArrayBuffer>).
      const imageId = workbook.addImage({
        buffer: imgBuffer as any,
        extension: ext as 'png' | 'jpeg',
      });

      // Place image in column A (col 1), row r+3 (data starts at row 3)
      // Image is 50px wide × 50px tall, centered in the 60px-tall row
      sheet.addImage(imageId, {
        tl: { col: 0.1, row: r + 2.1 }, // slight padding inside the cell
        ext: { width: 50, height: 50 },
      });
    } catch {
      // Image embedding failed — skip (the cell stays empty)
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─────────────────────────────────────────────────────────────────
// Main route handler
// ─────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const embedImages = searchParams.get('embedImages') === 'true';
    const columnsParam = searchParams.get('columns');

    // Resolve which columns to include
    const cols = resolveColumns(columnsParam);

    // Build the where clause (supports both srFrom/srTo and sourceRowMin/Max)
    const where = buildWhereClause(searchParams);

    // Fetch products with relations
    const data = await db.product.findMany({
      where,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: { include: { variantGroup: true } },
      },
      orderBy: { sourceRow: 'asc' },
    });

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No products found to export.' },
        { status: 404 }
      );
    }

    let excelBuffer: Buffer;
    let contentType: string;
    let filename: string;

    if (embedImages) {
      excelBuffer = await exportExcelWithImages(data, cols);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const dateStr = new Date().toISOString().slice(0, 10);
      filename = `alnassim_catalog_with_images_${dateStr}_${data.length}products.xlsx`;
    } else {
      excelBuffer = await exportExcelOnly(data, cols);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const dateStr = new Date().toISOString().slice(0, 10);
      filename = `alnassim_catalog_${dateStr}_${data.length}products.xlsx`;
    }

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(excelBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('  /api/products/export — FAILED');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`  Error message: ${error?.message || 'Unknown error'}`);
    if (error?.stack) {
      error.stack.split('\n').forEach((line: string) => console.error(`    ${line}`));
    }
    console.error('═══════════════════════════════════════════════════════════');

    return NextResponse.json({
      error: 'Failed to export Excel file',
      details: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}
