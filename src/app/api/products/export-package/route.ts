import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS, resolveImageLinks, resolveVariants } from '@/lib/lookups';
import { Readable } from 'stream';

// Create archiver instance
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
 *   - Products.xlsx (with embedded primary images + Image Folder column)
 *   - Images/ folder organized by ND Number or Barcode
 *
 * Uses exceljs for image embedding (xlsx-js-style doesn't support images).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceRowFrom = searchParams.get('srFrom');
    const sourceRowTo = searchParams.get('srTo');
    const quality = searchParams.get('quality') || 'high';

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

    // Use exceljs for image embedding support
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Master Catalog');

    // Define columns: existing COLUMN_DEFS + Primary Image + Image Folder
    const columns: any[] = [
      // Primary Image column first (so the image is visible at the start)
      { header: 'Primary Image', key: '_primaryImage', width: 15 },
      // All existing columns
      ...COLUMN_DEFS.map((col: any) => ({
        header: col.header,
        key: col.field,
        width: Math.max(10, Math.min(50, (col.header?.length || 10) + 5)),
      })),
      // Image Folder column at the end
      { header: 'Image Folder', key: '_imageFolder', width: 30 },
    ];

    ws.columns = columns;

    // Style header row
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Track image entries for the ZIP
    const imageEntries: { folderName: string; filename: string; url: string }[] = [];

    // Add data rows
    for (let r = 0; r < data.length; r++) {
      const product = data[r] as any;
      const rowIdx = r + 2; // Row 1 is header

      // Determine folder name
      const folderName = product.ndNumber?.trim() ||
        (product.barcode ? `Barcode_${product.barcode}` : `Product_${product.productId || product.sourceRow}`);

      // Build row data
      const rowData: any = {};
      for (const colDef of COLUMN_DEFS) {
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
        rowData[colDef.field] = value === null || value === undefined ? '' : value;
      }
      rowData['_imageFolder'] = `Images/${folderName}`;

      // Add the row
      const row = ws.addRow(rowData);

      // Set row height for image (90px ≈ 68 in Excel units)
      row.height = 90;

      // Find primary image (or first image)
      const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];

      if (primaryImage) {
        // Build download URL (use Drive thumbnail for reliability)
        let downloadUrl = '';
        if (primaryImage.driveFileId) {
          downloadUrl = `https://drive.google.com/thumbnail?id=${primaryImage.driveFileId}&${sizeParam}`;
        } else if (primaryImage.thumbnailUrl) {
          downloadUrl = primaryImage.thumbnailUrl;
        } else if (primaryImage.imageUrl && !primaryImage.imageUrl.startsWith('data:')) {
          downloadUrl = primaryImage.imageUrl;
        }

        if (downloadUrl) {
          try {
            // Download the image
            const imgRes = await fetch(downloadUrl, { redirect: 'follow' });
            if (imgRes.ok) {
              const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

              // Determine image extension from content-type
              const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
              const ext = contentType.includes('png') ? 'png' : 'jpeg';

              // Embed image in the Primary Image column (column 1 = A)
              const imageId = workbook.addImage({
                buffer: imgBuffer,
                extension: ext,
              });

              // Place image in cell A{rowIdx}, sized to fit
              ws.addImage(imageId, {
                tl: { col: 0, row: rowIdx - 1 },
                br: { col: 1, row: rowIdx },
                editAs: 'oneCell',
              });

              console.log(`[export-package] Embedded image for ${folderName} (row ${rowIdx})`);
            } else {
              console.warn(`[export-package] Failed to download image for ${folderName}: HTTP ${imgRes.status}`);
            }
          } catch (imgErr) {
            console.warn(`[export-package] Error downloading image for ${folderName}:`, imgErr);
          }
        }

        // Collect all images for the ZIP folder
        if (product.images && product.images.length > 0) {
          for (let i = 0; i < product.images.length; i++) {
            const img = product.images[i];
            let imgUrl = '';
            if (img.driveFileId) {
              imgUrl = `https://drive.google.com/thumbnail?id=${img.driveFileId}&${sizeParam}`;
            } else if (img.thumbnailUrl) {
              imgUrl = img.thumbnailUrl;
            } else if (img.imageUrl && !img.imageUrl.startsWith('data:')) {
              imgUrl = img.imageUrl;
            }

            if (imgUrl) {
              const filename = img.isPrimary ? 'primary.jpg' : `image${i + 1}.jpg`;
              imageEntries.push({ folderName, filename, url: imgUrl });
            }
          }
        }
      }
    }

    // Generate Excel buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();
    console.log(`[export-package] Excel generated (${excelBuffer.length} bytes), ${imageEntries.length} images for ZIP`);

    // Create ZIP stream
    const archive = createZip();

    // Add the Excel file
    archive.append(Readable.from(Buffer.from(excelBuffer)), { name: 'Products.xlsx' });

    // Download and add images to the ZIP — sequential to avoid memory issues
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
          console.warn(`[export-package] Failed to download: ${entry.url} (HTTP ${imgRes.status})`);
        }
      } catch (err) {
        imagesFailed++;
        console.warn(`[export-package] Error downloading ${entry.url}:`, err);
      }
    }

    console.log(`[export-package] ZIP images: ${imagesAdded} added, ${imagesFailed} failed`);

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
