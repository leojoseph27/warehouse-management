import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS, resolveImageLinks, resolveVariants } from '@/lib/lookups';
import PDFDocument from 'pdfkit';

// PDF generation for 2,500+ products with images can take 30-60s.
export const maxDuration = 300;
export const runtime = 'nodejs';

/**
 * GET /api/products/export-pdf
 *
 * Generates a multi-page PDF catalog with:
 *   - First column: product's primary image (thumbnail)
 *   - Subsequent columns: selected product fields (same order as Excel export)
 *   - Header row repeated on each page
 *   - Red font for modified fields (change tracking, same as Excel export)
 *   - Auto-fitting column widths
 *
 * Query params:
 *   - srFrom, srTo: source row range filter (same as Excel export)
 *   - columns: comma-separated list of field names to include.
 *              If omitted/empty, ALL columns are included.
 *              Example: ?columns=productId,nameEn,brand,defaultPrice
 *
 * The PDF is generated server-side with pdfkit and streamed back as a binary
 * download. Images are fetched from Google Drive thumbnail URLs.
 */

// ── Layout constants ────────────────────────────────────────────────
const PAGE_MARGIN = 30;            // px, left/right/top/bottom margin
const IMAGE_COL_WIDTH = 70;        // px, first column (image)
const IMAGE_SIZE = 55;             // px, image square (centered in cell)
const ROW_HEIGHT = 60;             // px, data row height (tall enough for image)
const HEADER_ROW_HEIGHT = 22;      // px, header row height
const MIN_COL_WIDTH = 40;          // px, minimum text column width
const MAX_COL_WIDTH = 140;         // px, maximum text column width
const FONT_SIZE = 7;               // pt, cell text
const HEADER_FONT_SIZE = 7;        // pt, header text
const HEADER_BG = '#E5E7EB';       // light gray header background
const MODIFIED_COLOR = '#DC2626';  // red for modified values
const GRID_COLOR = '#D1D5DB';      // light gray grid lines
const TEXT_COLOR = '#111827';      // near-black text

// Fields tracked for change detection (same as Excel export)
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

/** Truncate a string to fit within a max character count, appending "…" */
function truncate(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)) + '…';
}

/** Get the primary image URL for a product (thumbnail preferred for speed). */
function getPrimaryImageUrl(product: any): string | null {
  if (!product.images || product.images.length === 0) return null;
  // Primary image first, then first by displayOrder
  const sorted = [...product.images].sort((a: any, b: any) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
  const img = sorted[0];
  // Prefer thumbnailUrl (smaller, faster to download) → imageUrl fallback
  return img.thumbnailUrl || img.imageUrl || null;
}

/** Fetch an image URL and return a Buffer. Returns null on failure. */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout per image
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    // Only accept image types — pdfkit can embed JPEG and PNG
    if (!contentType.includes('image/jpeg') && !contentType.includes('image/png') && !contentType.includes('image/jpg')) {
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    // Network error, timeout, or invalid URL — return null (placeholder shown)
    return null;
  }
}

/**
 * Compute column widths based on the selected columns.
 * Image column is fixed width; text columns auto-fit based on header length
 * and a sample of data values.
 */
function computeColumnWidths(
  selectedDefs: typeof COLUMN_DEFS,
  data: any[],
  pageContentWidth: number
): number[] {
  // Image column is always first and fixed
  const imageColWidth = IMAGE_COL_WIDTH;
  const remainingWidth = pageContentWidth - imageColWidth;
  const textColCount = selectedDefs.length;
  if (textColCount === 0) return [imageColWidth];

  // Equal-width default, then adjust based on content
  const equalWidth = remainingWidth / textColCount;
  const rawWidths: number[] = selectedDefs.map((def, i) => {
    // Sample the first 20 data rows to estimate max content length
    const sampleSize = Math.min(data.length, 20);
    let maxLen = def.header.length;
    for (let r = 0; r < sampleSize; r++) {
      const product = data[r];
      let value: any;
      if (def.field === 'imageLinks') value = resolveImageLinks(product);
      else if (def.field === 'variants') value = resolveVariants(product, data);
      else value = product[def.field];
      const str = value == null ? '' : String(value);
      // Use first line for multi-line values
      const firstLine = str.split('\n')[0] || '';
      if (firstLine.length > maxLen) maxLen = firstLine.length;
    }
    // Estimate width: ~4px per char at FONT_SIZE 7
    const estimated = maxLen * 4 + 8;
    return Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, estimated));
  });

  // Normalize to fit remainingWidth
  const totalRaw = rawWidths.reduce((s, w) => s + w, 0);
  const scale = totalRaw > remainingWidth ? remainingWidth / totalRaw : 1;
  const scaledWidths = rawWidths.map((w) => Math.max(MIN_COL_WIDTH, w * scale));

  return [imageColWidth, ...scaledWidths];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceRowFrom = searchParams.get('srFrom');
    const sourceRowTo = searchParams.get('srTo');
    const columnsParam = searchParams.get('columns') || '';

    // ── Build the same where clause as the Excel export ──
    const where: any = {};
    if (sourceRowFrom !== null && sourceRowTo !== null) {
      const from = Number(sourceRowFrom);
      const to = Number(sourceRowTo);
      if (!isNaN(from) && !isNaN(to) && from <= to) {
        where.sourceRow = { gte: from, lte: to };
      }
    }

    // ── Determine which columns to include ──
    // Parse the columns param (comma-separated field names)
    let selectedDefs = COLUMN_DEFS;
    if (columnsParam.trim()) {
      const requestedFields = columnsParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (requestedFields.length > 0) {
        // Filter COLUMN_DEFS to only the requested fields, preserving order
        selectedDefs = COLUMN_DEFS.filter((def) =>
          requestedFields.includes(def.field)
        );
        // If none matched (invalid field names), fall back to all
        if (selectedDefs.length === 0) selectedDefs = COLUMN_DEFS;
      }
    }

    // ── Fetch products ──
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

    // ── Create PDF document (landscape A4 for wider tables) ──
    // Landscape A4: 842 x 595 pt
    const doc = new PDFDocument({
      size: 'a4',
      layout: 'landscape',
      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
      },
      bufferPages: true, // enable page buffer so we can add page numbers
    });

    // Set default font
    doc.registerFont('Helvetica', 'Helvetica'); // built-in, no font file needed
    doc.font('Helvetica');

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - PAGE_MARGIN * 2;

    // ── Compute column widths ──
    const colWidths = computeColumnWidths(selectedDefs, data, contentWidth);
    const totalCols = colWidths.length; // image + selected text columns

    // ── Pre-fetch all primary images in parallel (with concurrency limit) ──
    // Fetching images one-by-one during row rendering would be slow and could
    // cause timeouts. Pre-fetch in batches of 10 for efficiency.
    const imageBuffers: (Buffer | null)[] = new Array(data.length).fill(null);
    const CONCURRENCY = 10;
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

    // ── Draw the table ──
    let y = PAGE_MARGIN;
    let rowIndex = 0;
    const startX = PAGE_MARGIN;

    /** Draw the header row at the current y position. */
    const drawHeader = (yPos: number) => {
      let x = startX;
      // Header background
      doc.rect(x, yPos, contentWidth, HEADER_ROW_HEIGHT).fill(HEADER_BG);
      doc.fillColor(TEXT_COLOR);
      doc.fontSize(HEADER_FONT_SIZE);
      doc.font('Helvetica-Bold');

      // Image column header
      doc.text('Image', x + 4, yPos + 6, {
        width: colWidths[0] - 8,
        height: HEADER_ROW_HEIGHT - 8,
        ellipsis: true,
      });
      x += colWidths[0];

      // Text column headers
      for (let c = 0; c < selectedDefs.length; c++) {
        const def = selectedDefs[c];
        const w = colWidths[c + 1];
        doc.text(def.header, x + 3, yPos + 6, {
          width: w - 6,
          height: HEADER_ROW_HEIGHT - 8,
          ellipsis: true,
        });
        x += w;
      }

      // Bottom border of header
      doc
        .moveTo(startX, yPos + HEADER_ROW_HEIGHT)
        .lineTo(startX + contentWidth, yPos + HEADER_ROW_HEIGHT)
        .strokeColor(GRID_COLOR)
        .lineWidth(0.5)
        .stroke();

      doc.font('Helvetica');
      return yPos + HEADER_ROW_HEIGHT;
    };

    /** Draw a single data row at the current y position. */
    const drawRow = (yPos: number, product: any, imgBuffer: Buffer | null, rowIdx: number) => {
      let x = startX;

      // Alternate row background for readability
      if (rowIdx % 2 === 1) {
        doc.rect(x, yPos, contentWidth, ROW_HEIGHT).fill('#F9FAFB');
      }

      // ── Image cell ──
      const cellCenterY = yPos + (ROW_HEIGHT - IMAGE_SIZE) / 2;
      const cellCenterX = x + (colWidths[0] - IMAGE_SIZE) / 2;
      if (imgBuffer) {
        try {
          doc.image(imgBuffer, cellCenterX, cellCenterY, {
            fit: [IMAGE_SIZE, IMAGE_SIZE],
            align: 'center',
            valign: 'center',
          });
        } catch {
          // Image embedding failed — draw placeholder
          doc.rect(cellCenterX, cellCenterY, IMAGE_SIZE, IMAGE_SIZE)
            .strokeColor(GRID_COLOR)
            .lineWidth(0.5)
            .stroke();
          doc.fontSize(6)
            .fillColor('#9CA3AF')
            .text('No img', cellCenterX, cellCenterY + IMAGE_SIZE / 2 - 4, {
              width: IMAGE_SIZE,
              align: 'center',
            });
        }
      } else {
        // No image buffer — draw placeholder box
        doc.rect(cellCenterX, cellCenterY, IMAGE_SIZE, IMAGE_SIZE)
          .strokeColor(GRID_COLOR)
          .lineWidth(0.5)
          .stroke();
        doc.fontSize(6)
          .fillColor('#9CA3AF')
          .text('No img', cellCenterX, cellCenterY + IMAGE_SIZE / 2 - 4, {
            width: IMAGE_SIZE,
            align: 'center',
          });
      }
      doc.fillColor(TEXT_COLOR);
      x += colWidths[0];

      // ── Text cells ──
      doc.fontSize(FONT_SIZE);
      for (let c = 0; c < selectedDefs.length; c++) {
        const def = selectedDefs[c];
        const w = colWidths[c + 1];

        // Resolve the cell value (same logic as Excel export)
        let value: any;
        if (def.field === 'imageLinks') value = resolveImageLinks(product);
        else if (def.field === 'variants') value = resolveVariants(product, data);
        else value = product[def.field];

        const str = value == null ? '' : String(value);
        const modified = isFieldModified(product, def.field);

        // For multi-line values (imageLinks, variants), only show first line in PDF
        const firstLine = str.split('\n')[0] || '';
        // Truncate to fit column width (~1 char per 4px at font size 7)
        const maxChars = Math.floor((w - 6) / 4);
        const display = truncate(firstLine, maxChars);

        if (modified) {
          doc.fillColor(MODIFIED_COLOR);
          doc.font('Helvetica-Bold');
        } else {
          doc.fillColor(TEXT_COLOR);
          doc.font('Helvetica');
        }

        doc.text(display, x + 3, yPos + 8, {
          width: w - 6,
          height: ROW_HEIGHT - 12,
          ellipsis: true,
        });

        x += w;
      }

      doc.font('Helvetica');
      doc.fillColor(TEXT_COLOR);

      // Row bottom border
      doc
        .moveTo(startX, yPos + ROW_HEIGHT)
        .lineTo(startX + contentWidth, yPos + ROW_HEIGHT)
        .strokeColor(GRID_COLOR)
        .lineWidth(0.3)
        .stroke();

      // Vertical column borders
      let vx = startX;
      for (let c = 0; c <= totalCols; c++) {
        doc
          .moveTo(vx, yPos)
          .lineTo(vx, yPos + ROW_HEIGHT)
          .strokeColor(GRID_COLOR)
          .lineWidth(0.3)
          .stroke();
        vx += colWidths[c] || 0;
      }

      return yPos + ROW_HEIGHT;
    };

    // ── Draw first header ──
    y = drawHeader(y);

    // ── Draw data rows with page breaks ──
    for (let r = 0; r < data.length; r++) {
      // Check if we need a page break
      if (y + ROW_HEIGHT > pageHeight - PAGE_MARGIN - 15) {
        // 15px reserved for page number footer
        doc.addPage();
        y = PAGE_MARGIN;
        // Repeat header on new page
        y = drawHeader(y);
      }
      y = drawRow(y, data[r], imageBuffers[r], rowIndex);
      rowIndex++;
    }

    // ── Add page numbers to every page ──
    const range = doc.bufferedPageRange();
    const totalPageCount = range.start + range.count;
    for (let i = range.start; i < totalPageCount; i++) {
      doc.switchToPage(i);
      // Page number footer (bottom-right)
      doc.fontSize(7)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text(
          `Page ${i + 1} of ${totalPageCount}`,
          pageWidth - PAGE_MARGIN - 80,
          pageHeight - PAGE_MARGIN / 2 - 4,
          { width: 80, align: 'right' }
        );
      // Generated timestamp footer (bottom-left)
      doc.fontSize(6)
        .fillColor('#9CA3AF')
        .text(
          `Generated ${new Date().toISOString().slice(0, 10)}`,
          PAGE_MARGIN,
          pageHeight - PAGE_MARGIN / 2 - 4,
          { width: 200, align: 'left' }
        );
    }

    // ── Stream the PDF to the response ──
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });

    // Filename includes date and row count
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `alnassim_catalog_${dateStr}_${data.length}products.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('  /api/products/export-pdf — FAILED');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`  Error message: ${error?.message || 'Unknown error'}`);
    if (error?.stack) {
      error.stack.split('\n').forEach((line: string) => console.error(`    ${line}`));
    }
    console.error('═══════════════════════════════════════════════════════════');

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
