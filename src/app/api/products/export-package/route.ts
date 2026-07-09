import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS, resolveImageLinks, resolveVariants } from '@/lib/lookups';
import * as XLSX from 'xlsx-js-style';
import { Readable } from 'stream';

// Create archiver instance — workaround for ESM/CJS interop
function createZip() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const archiverModule = require('archiver');
  const ArchiverClass = archiverModule.Archiver || archiverModule.default || archiverModule;
  if (typeof ArchiverClass === 'function') {
    return new ArchiverClass('zip', { zlib: { level: 5 } });
  }
  return archiverModule('zip', { zlib: { level: 5 } });
}

export const maxDuration = 300;
export const runtime = 'nodejs';

/**
 * GET /api/products/export-package
 *
 * Generates a ZIP file containing:
 *   - Products.xlsx (with Image Folder column)
 *   - Images/ folder organized by ND Number or Barcode
 *
 * Query params:
 *   srFrom, srTo — source row range filter
 *   quality      — high | medium | low (controls image fetch size)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceRowFrom = searchParams.get('srFrom');
    const sourceRowTo = searchParams.get('srTo');
    const quality = searchParams.get('quality') || 'high';

    // Quality → Drive thumbnail size param
    const sizeParam = quality === 'high' ? 'sz=w2000' : quality === 'medium' ? 'sz=w1000' : 'sz=w400';

    const where: any = {};
    if (sourceRowFrom !== null && sourceRowTo !== null) {
      where.sourceRow = { gte: Number(sourceRowFrom), lte: Number(sourceRowTo) };
    }

    // Fetch all products with images
    const data = await db.product.findMany({
      where,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: { include: { variantGroup: true } },
      },
      orderBy: { sourceRow: 'asc' },
    });

    console.log(`[export-package] Found ${data.length} products, quality=${quality}`);

    // Build the Excel workbook (same as regular export + Image Folder column)
    const workbook = XLSX.utils.book_new();
    const worksheet: XLSX.WorkSheet = {};
    const totalCols = COLUMN_DEFS.length;
    const totalRows = data.length;

    // Row 1: Group headers
    const merges: XLSX.Range[] = [];
    let colOffset = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups: any[] = [];
    let currentGroup = '';
    for (let c = 0; c < totalCols; c++) {
      if (COLUMN_DEFS[c].group !== currentGroup) {
        if (currentGroup) groups.push({ name: currentGroup, start: colOffset });
        currentGroup = COLUMN_DEFS[c].group;
        colOffset = c;
      }
    }
    if (currentGroup) groups.push({ name: currentGroup, start: colOffset });
    // Simplified: just write headers without merges for the package
    for (let c = 0; c < totalCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      worksheet[cellRef] = { t: 's', v: COLUMN_DEFS[c].header, s: { font: { bold: true } } };
    }

    // Track which images go into which folder
    const imageEntries: { folderName: string; filename: string; url: string }[] = [];

    // Row 1+: Data rows
    for (let r = 0; r < totalRows; r++) {
      const product = data[r] as any;
      // Determine folder name for this product
      const folderName = product.ndNumber?.trim() ||
        (product.barcode ? `Barcode_${product.barcode}` : `Product_${product.productId || product.sourceRow}`);

      for (let c = 0; c < totalCols; c++) {
        const colDef = COLUMN_DEFS[c];
        const cellRef = XLSX.utils.encode_cell({ r: r + 1, c });

        let value: any;
        if (colDef.field === 'imageLinks') {
          value = resolveImageLinks(product);
        } else if (colDef.field === 'variants') {
          value = resolveVariants(product, data);
        } else {
          value = product[colDef.field];
        }

        // Truncate to Excel limit
        if (typeof value === 'string' && value.length > 32767) {
          value = value.slice(0, 32747) + '... [truncated]';
        }

        worksheet[cellRef] = {
          t: typeof value === 'number' ? 'n' : 's',
          v: value === null || value === undefined ? '' : value,
        };
      }

      // Collect images for the ZIP
      if (product.images && product.images.length > 0) {
        for (let i = 0; i < product.images.length; i++) {
          const img = product.images[i];
          // Use Drive thumbnail URL for download (more reliable than uc?export=view)
          let downloadUrl = '';
          if (img.driveFileId) {
            downloadUrl = `https://drive.google.com/thumbnail?id=${img.driveFileId}&${sizeParam}`;
          } else if (img.thumbnailUrl) {
            downloadUrl = img.thumbnailUrl;
          } else if (img.imageUrl && !img.imageUrl.startsWith('data:')) {
            downloadUrl = img.imageUrl;
          }

          if (downloadUrl) {
            const filename = img.isPrimary ? 'primary.jpg' : `image${i + 1}.jpg`;
            imageEntries.push({ folderName, filename, url: downloadUrl });
          }
        }
      }
    }

    // Set sheet range
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(totalRows, 1), c: totalCols - 1 },
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Catalog');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    console.log(`[export-package] Excel generated (${excelBuffer.length} bytes), ${imageEntries.length} images to download`);

    // Create ZIP stream
    const archive = createZip();

    // Add the Excel file
    archive.append(Readable.from(excelBuffer), { name: 'Products.xlsx' });

    // Download and add images — process sequentially to avoid memory issues
    let imagesAdded = 0;
    let imagesFailed = 0;

    for (const entry of imageEntries) {
      try {
        const imgRes = await fetch(entry.url, { redirect: 'follow' });
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          archive.append(imgBuffer, { name: `Images/${entry.folderName}/${entry.filename}` });
          imagesAdded++;
        } else {
          imagesFailed++;
          console.warn(`[export-package] Failed to download image: ${entry.url} (HTTP ${imgRes.status})`);
        }
      } catch (err) {
        imagesFailed++;
        console.warn(`[export-package] Error downloading image ${entry.url}:`, err);
      }
    }

    console.log(`[export-package] Images: ${imagesAdded} added, ${imagesFailed} failed`);

    // Finalize the archive
    archive.finalize();

    // Collect ZIP into a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of archive) {
      chunks.push(Buffer.from(chunk));
    }
    const zipBuffer = Buffer.concat(chunks);

    console.log(`[export-package] ZIP generated (${zipBuffer.length} bytes)`);

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="product_export_package.zip"',
      },
    });
  } catch (error: any) {
    console.error('[export-package] FAILED:', error);
    return NextResponse.json(
      { error: 'Failed to generate export package', details: error?.message },
      { status: 500 }
    );
  }
}
