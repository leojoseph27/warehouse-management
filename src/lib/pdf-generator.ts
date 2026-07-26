/**
 * Client-side PDF catalog generator using jsPDF + jsPDF-AutoTable.
 *
 * WHY CLIENT-SIDE?
 *   - No serverless font/binary bundling issues (the pdfkit .afm problem)
 *   - Browser handles fonts natively (uses jsPDF's built-in Helvetica which
 *     is embedded in the jsPDF library itself, not loaded from disk)
 *   - Images load directly from Google Drive URLs in the browser (no
 *     server-side fetch with timeouts)
 *   - Works on any hosting platform (Vercel, Netlify, etc.) with zero
 *     special configuration
 *   - jspdf-autotable handles multi-page tables with repeating headers,
 *     column width auto-fitting, and cell formatting automatically
 *
 * ARCHITECTURE:
 *   1. Fetch all matching products from /api/products (paginated, with progress)
 *   2. Load primary image thumbnails in parallel (with progress + concurrency limit)
 *   3. Generate the PDF:
 *      - Landscape A4
 *      - First column: primary image (drawn via didDrawCell hook)
 *      - Remaining columns: selected product fields
 *      - Red font for modified fields (change tracking)
 *      - Auto-page-break with repeating headers
 *      - Page numbers in footer
 *   4. Trigger download
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  COLUMN_DEFS,
  resolveImageLinks,
  resolveVariants,
  type ColumnDef,
} from '@/lib/lookups';
import type { Product } from '@/store/inventory-store';

// ── Layout constants ────────────────────────────────────────────────
const IMAGE_COL_WIDTH = 18;       // mm, first column (image)
const IMAGE_SIZE_MM = 14;         // mm, image square inside the cell
const FONT_SIZE = 7;               // pt, cell text
const HEADER_FONT_SIZE = 7;        // pt, header text
const MODIFIED_COLOR: [number, number, number] = [220, 38, 38];     // #DC2626
const TEXT_COLOR: [number, number, number] = [17, 24, 39];          // #111827
const HEADER_BG: [number, number, number] = [229, 231, 235];        // #E5E7EB
const ALT_ROW_BG: [number, number, number] = [249, 250, 251];       // #F9FAFB

// Fields tracked for change detection (same set as Excel export)
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

function isFieldModified(product: Product, field: string): boolean {
  if (!product.original || !TRACKED_FIELDS.has(field)) return false;
  const currentValue = (product as any)[field];
  const originalValue = field === 'productId' ? product.original.origProductId : (product.original as any)[field];
  const currentStr = currentValue == null ? '' : String(currentValue).trim();
  const originalStr = originalValue == null ? '' : String(originalValue).trim();
  return currentStr !== originalStr;
}

/** Get the primary image URL for a product (thumbnail preferred for speed). */
function getPrimaryImageUrl(product: Product): string | null {
  if (!product.images || product.images.length === 0) return null;
  const sorted = [...product.images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
  const img = sorted[0];
  return img.thumbnailUrl || img.imageUrl || null;
}

/** Load an image URL and return an HTMLImageElement (for canvas conversion). */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // needed for canvas.toDataURL() on cross-origin images
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Convert an HTMLImageElement to a JPEG data URL at a given max dimension.
 * We downscale to ~200px to keep the PDF file size reasonable (each image
 * becomes ~5-15KB instead of ~500KB).
 */
function imageToDataUrl(img: HTMLImageElement, maxDim: number = 200): string {
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG
  } catch {
    // If canvas is tainted (CORS), return empty string — placeholder shown
    return '';
  }
}

export interface PdfProgress {
  stage: 'fetching' | 'images' | 'generating' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
}

export interface PdfExportOptions {
  /** Serial-number range filter. If null, export all products. */
  srFrom?: number | null;
  srTo?: number | null;
  /** Columns to include. If null/empty, include ALL columns. */
  selectedFields?: string[] | null;
  /** Progress callback (called during fetching, image loading, and generation). */
  onProgress?: (progress: PdfProgress) => void;
}

/**
 * Fetch all matching products from /api/products (paginated).
 * Returns an array of Product objects.
 */
async function fetchAllProducts(
  srFrom: number | null | undefined,
  srTo: number | null | undefined,
  onProgress?: (current: number, total: number) => void
): Promise<Product[]> {
  const allProducts: Product[] = [];
  const pageSize = 100;
  let page = 1;
  let total = 0;

  // Fetch first page to get total count
  const params = new URLSearchParams();
  params.set('page', '1');
  params.set('limit', String(pageSize));
  params.set('sortBy', 'sourceRow');
  params.set('sortOrder', 'asc');
  if (srFrom != null && srTo != null) {
    params.set('sourceRowMin', String(srFrom));
    params.set('sourceRowMax', String(srTo));
  }

  const firstRes = await fetch(`/api/products?${params.toString()}`);
  if (!firstRes.ok) throw new Error(`Failed to fetch products: ${firstRes.status}`);
  const firstData = await firstRes.json();
  allProducts.push(...firstData.products);
  total = firstData.total;
  onProgress?.(allProducts.length, total);

  // Fetch remaining pages
  const totalPages = Math.ceil(total / pageSize);
  for (page = 2; page <= totalPages; page++) {
    const pageParams = new URLSearchParams(params);
    pageParams.set('page', String(page));
    const res = await fetch(`/api/products?${pageParams.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch page ${page}: ${res.status}`);
    const data = await res.json();
    allProducts.push(...data.products);
    onProgress?.(allProducts.length, total);
  }

  return allProducts;
}

/**
 * Pre-load all primary images in parallel (with concurrency limit).
 * Returns a map of productIndex → dataURL (or null if failed).
 */
async function preloadImages(
  products: Product[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, string>> {
  const imageMap = new Map<number, string>();
  const CONCURRENCY = 8;
  let loaded = 0;

  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = products.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (product) => {
        const url = getPrimaryImageUrl(product);
        if (!url) return null;
        const img = await loadImage(url);
        return imageToDataUrl(img, 200);
      })
    );
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled' && result.value) {
        imageMap.set(i + j, result.value);
      }
      loaded++;
      onProgress?.(loaded, products.length);
    }
  }

  return imageMap;
}

/**
 * Generate and download a PDF catalog.
 *
 * @param options Export options (SR range, selected columns, progress callback)
 * @returns The generated jsPDF document (in case the caller wants to do
 *          something else with it, like open in a new tab).
 */
export async function generatePdfCatalog(options: PdfExportOptions): Promise<jsPDF> {
  const { srFrom, srTo, selectedFields, onProgress } = options;

  // ── Determine which columns to include ──
  let cols: ColumnDef[] = COLUMN_DEFS;
  if (selectedFields && selectedFields.length > 0) {
    cols = COLUMN_DEFS.filter((d) => selectedFields.includes(d.field));
    if (cols.length === 0) cols = COLUMN_DEFS;
  }

  // ── Stage 1: Fetch all products ──
  onProgress?.({ stage: 'fetching', current: 0, total: 0, message: 'Fetching products…' });
  const products = await fetchAllProducts(srFrom, srTo, (current, total) => {
    onProgress?.({
      stage: 'fetching',
      current,
      total,
      message: `Fetching products… (${current}/${total})`,
    });
  });

  if (products.length === 0) {
    throw new Error('No products found to export.');
  }

  // ── Stage 2: Pre-load images ──
  onProgress?.({
    stage: 'images',
    current: 0,
    total: products.length,
    message: 'Loading primary images…',
  });
  const imageDataUrls = await preloadImages(products, (current, total) => {
    onProgress?.({
      stage: 'images',
      current,
      total,
      message: `Loading primary images… (${current}/${total})`,
    });
  });

  // ── Stage 3: Generate PDF ──
  onProgress?.({
    stage: 'generating',
    current: 0,
    total: products.length,
    message: 'Generating PDF…',
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // ── Build the table head: [Image, ...selected column headers] ──
  const head: string[][] = [['Image', ...cols.map((c) => c.header)]];

  // ── Build the table body ──
  const body: (string | null)[][] = products.map((product) => {
    const row: (string | null)[] = [null]; // first cell = image (drawn via didDrawCell)
    for (const def of cols) {
      let value: any;
      if (def.field === 'imageLinks') value = resolveImageLinks(product);
      else if (def.field === 'variants') value = resolveVariants(product, products);
      else value = (product as any)[def.field];

      // For multi-line values, show only first line in PDF
      const str = value == null ? '' : String(value);
      const firstLine = str.split('\n')[0] || '';
      row.push(firstLine);
    }
    return row;
  });

  // ── Column styles: first column is image, rest are text ──
  // Calculate available width (A4 landscape = 297mm wide, minus 20mm margins)
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10; // mm
  const availableWidth = pageWidth - margin * 2;
  const textColCount = cols.length;
  const textColWidth = (availableWidth - IMAGE_COL_WIDTH) / textColCount;

  const columnStyles: any = {
    0: { cellWidth: IMAGE_COL_WIDTH, halign: 'center', valign: 'middle' },
  };
  for (let i = 0; i < textColCount; i++) {
    // Cap column width at 50mm so very wide tables don't have huge columns
    columnStyles[i + 1] = { cellWidth: Math.min(textColWidth, 50), overflow: 'linebreak' };
  }

  // ── Track which cells are modified (for red font) ──
  // Build a 2D array: modifiedFlags[rowIndex][colIndex] = boolean
  const modifiedFlags: boolean[][] = products.map((product) => {
    const flags: boolean[] = [false]; // image column never "modified"
    for (const def of cols) {
      flags.push(isFieldModified(product, def.field));
    }
    return flags;
  });

  // ── Row height — tall enough for the image ──
  const rowHeight = IMAGE_SIZE_MM + 6; // ~20mm

  // ── Generate the table with autoTable ──
  autoTable(doc, {
    head,
    body,
    startY: margin,
    margin: { left: margin, right: margin, top: margin, bottom: margin + 8 },
    styles: {
      fontSize: FONT_SIZE,
      cellPadding: 1.5,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: TEXT_COLOR,
      lineColor: [209, 213, 219],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: TEXT_COLOR,
      fontSize: HEADER_FONT_SIZE,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: ALT_ROW_BG,
    },
    columnStyles,
    rowPageBreak: 'auto',
    tableWidth: 'wrap',
    // ── Draw images in the first column via didDrawCell hook ──
    didDrawCell: (data: any) => {
      // Only draw in body cells (not header), and only in the first column
      if (data.section === 'body' && data.column.index === 0) {
        const rowIndex = data.row.index;
        const cellX = data.cell.x;
        const cellY = data.cell.y;
        const cellW = data.cell.width;
        const cellH = data.cell.height;

        // Center the image in the cell
        const imgX = cellX + (cellW - IMAGE_SIZE_MM) / 2;
        const imgY = cellY + (cellH - IMAGE_SIZE_MM) / 2;

        const dataUrl = imageDataUrls.get(rowIndex);
        if (dataUrl) {
          try {
            doc.addImage(dataUrl, 'JPEG', imgX, imgY, IMAGE_SIZE_MM, IMAGE_SIZE_MM);
          } catch {
            // Image embedding failed — draw placeholder
            drawPlaceholder(doc, imgX, imgY, IMAGE_SIZE_MM);
          }
        } else {
          drawPlaceholder(doc, imgX, imgY, IMAGE_SIZE_MM);
        }
      }
    },
    // ── Apply red font to modified cells via didParseCell ──
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const rowIndex = data.row.index;
        const colIndex = data.column.index;
        if (modifiedFlags[rowIndex] && modifiedFlags[rowIndex][colIndex]) {
          data.cell.styles.textColor = MODIFIED_COLOR;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ── Add page numbers + generation date to every page ──
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Page number (bottom-right)
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin - 20,
      pageHeight - 4,
      { align: 'right' }
    );
    // Generation date (bottom-left)
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text(
      `Generated ${new Date().toISOString().slice(0, 10)} — ${products.length} products`,
      margin,
      pageHeight - 4
    );
  }

  // ── Trigger download ──
  onProgress?.({ stage: 'done', current: products.length, total: products.length, message: 'PDF generated.' });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `alnassim_catalog_${dateStr}_${products.length}products.pdf`;
  doc.save(filename);

  return doc;
}

/** Draw a "No img" placeholder box where an image would go. */
function drawPlaceholder(doc: jsPDF, x: number, y: number, size: number) {
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.2);
  doc.rect(x, y, size, size);
  doc.setFontSize(5);
  doc.setTextColor(156, 163, 175);
  doc.text('No img', x + size / 2, y + size / 2, { align: 'center', baseline: 'middle' });
}
