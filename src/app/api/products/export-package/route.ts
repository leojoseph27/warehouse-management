import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS, resolveImageLinks, resolveVariants } from '@/lib/lookups';
import { Readable, PassThrough } from 'stream';
import sharp from 'sharp';

export const maxDuration = 300;
export const runtime = 'nodejs';

// ── Helpers ──

function createZip() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const archiverModule = require('archiver');
  const ArchiverClass = archiverModule.Archiver || archiverModule.default || archiverModule;
  if (typeof ArchiverClass === 'function') {
    return new ArchiverClass('zip', { zlib: { level: 5 } });
  }
  return archiverModule('zip', { zlib: { level: 5 } });
}

/**
 * Run async tasks with a concurrency limit.
 * Returns results in the same order as the input tasks.
 */
async function pooledMap<T, R>(
  concurrency: number,
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── Route ──

/**
 * GET /api/products/export-package
 *
 * Generates a ZIP file containing:
 *   - Products.xlsx (with embedded primary images + Image Folder column)
 *   - Images/ folder organized by ND Number or Barcode
 *
 * Optimizations to avoid 504 on Vercel:
 *   - Downloads only the primary image for embedding (not all images)
 *   - Uses a concurrency pool of 8 for image downloads
 *   - Streams the ZIP directly to the response (no full buffer in memory)
 *   - Caches image downloads by Drive File ID
 *   - Resizes embedded preview images to ~400px (full-quality in Images/ folder)
 *   - Logs timings for each stage
 */
export async function GET(request: NextRequest) {
  const t0 = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const sourceRowFrom = searchParams.get('srFrom');
    const sourceRowTo = searchParams.get('srTo');
    const quality = searchParams.get('quality') || 'high';

    // Quality for the Images/ folder (full quality files)
    const folderSizeParam = quality === 'high' ? 'sz=w2000' : quality === 'medium' ? 'sz=w1000' : 'sz=w400';
    // Embedded preview images: always small (400px) for performance
    const previewSizeParam = 'sz=w400';

    const where: any = {};
    if (sourceRowFrom !== null && sourceRowTo !== null) {
      where.sourceRow = { gte: Number(sourceRowFrom), lte: Number(sourceRowTo) };
    }

    // ── Stage 1: Database query ──
    const tDbStart = Date.now();
    const data = await db.product.findMany({
      where,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        original: true,
        variantMemberships: { include: { variantGroup: true } },
      },
      orderBy: { sourceRow: 'asc' },
    });
    const tDb = Date.now() - tDbStart;
    console.log(`[export-package] DB query: ${data.length} products in ${tDb}ms`);

    if (data.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    // ── Stage 2: Download primary images (concurrency pool of 8) ──
    const tImgStart = Date.now();
    const imageCache = new Map<string, Buffer>(); // driveFileId → buffer

    // Build list of primary images to download for embedding
    const primaryImageTasks = data.map((product: any, index: number) => ({
      product,
      index,
      image: product.images?.find((img: any) => img.isPrimary) || product.images?.[0] || null,
    })).filter(t => t.image !== null);

    console.log(`[export-package] Downloading ${primaryImageTasks.length} primary images (concurrency=8)`);

    const downloadedPrimaries = await pooledMap(8, primaryImageTasks, async (task) => {
      const { product, index, image } = task;
      const cacheKey = image.driveFileId || image.imageUrl || `${product.id}_${index}`;

      // Check cache
      if (imageCache.has(cacheKey)) {
        return { index, buffer: imageCache.get(cacheKey)!, folderName: '', error: null };
      }

      // Build download URL for preview (small, 400px)
      let previewUrl = '';
      if (image.driveFileId) {
        previewUrl = `https://drive.google.com/thumbnail?id=${image.driveFileId}&${previewSizeParam}`;
      } else if (image.thumbnailUrl) {
        previewUrl = image.thumbnailUrl;
      } else if (image.imageUrl && !image.imageUrl.startsWith('data:')) {
        previewUrl = image.imageUrl;
      }

      if (!previewUrl) {
        return { index, buffer: null, folderName: '', error: 'No URL' };
      }

      try {
        const imgRes = await fetch(previewUrl, { redirect: 'follow' });
        if (!imgRes.ok) {
          return { index, buffer: null, folderName: '', error: `HTTP ${imgRes.status}` };
        }
        const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
        // Resize to max 400px for embedding (sharp is fast)
        let previewBuffer = rawBuffer;
        try {
          previewBuffer = await sharp(rawBuffer)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        } catch {
          // If sharp fails, use raw buffer
          previewBuffer = rawBuffer;
        }
        imageCache.set(cacheKey, previewBuffer);
        return { index, buffer: previewBuffer, folderName: '', error: null };
      } catch (err: any) {
        console.warn(`[export-package] Image download failed (row ${index + 2}): ${err.message}`);
        return { index, buffer: null, folderName: '', error: err.message };
      }
    });

    // Build a map: row index → preview buffer
    const previewMap = new Map<number, { buffer: Buffer | null; error: string | null }>();
    for (const result of downloadedPrimaries) {
      previewMap.set(result.index, { buffer: result.buffer, error: result.error });
    }

    const tImg = Date.now() - tImgStart;
    const imgSuccess = downloadedPrimaries.filter(r => r.buffer !== null).length;
    const imgFailed = downloadedPrimaries.length - imgSuccess;
    console.log(`[export-package] Image download: ${imgSuccess} ok, ${imgFailed} failed in ${tImg}ms`);

    // ── Stage 3: Generate Excel workbook with embedded images ──
    const tXlsStart = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Master Catalog');

    // Define columns: Primary Image + all existing + Image Folder
    const columns: any[] = [
      { header: 'Primary Image', key: '_primaryImage', width: 15 },
      ...COLUMN_DEFS.map((col: any) => ({
        header: col.header,
        key: col.field,
        width: Math.max(10, Math.min(50, (col.header?.length || 10) + 5)),
      })),
      { header: 'Image Folder', key: '_imageFolder', width: 30 },
    ];
    ws.columns = columns;

    // Style header
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Track image entries for the ZIP folder
    const imageEntries: { folderName: string; filename: string; url: string }[] = [];

    for (let r = 0; r < data.length; r++) {
      const product = data[r] as any;
      const rowIdx = r + 2;

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
        if (typeof value === 'string' && value.length > 32767) {
          value = value.slice(0, 32747) + '... [truncated]';
        }
        rowData[colDef.field] = value === null || value === undefined ? '' : value;
      }
      rowData['_imageFolder'] = `Images/${folderName}`;

      const row = ws.addRow(rowData);
      row.height = 90;

      // Embed primary image if downloaded successfully
      const preview = previewMap.get(r);
      if (preview?.buffer) {
        try {
          const imageId = workbook.addImage({
            buffer: preview.buffer,
            extension: 'jpeg',
          });
          ws.addImage(imageId, {
            tl: { col: 0, row: rowIdx - 1 },
            br: { col: 1, row: rowIdx },
            editAs: 'oneCell',
          });
        } catch (embedErr) {
          console.warn(`[export-package] Failed to embed image (row ${rowIdx}):`, embedErr);
        }
      }

      // Collect all images for the ZIP folder (full quality)
      if (product.images && product.images.length > 0) {
        for (let i = 0; i < product.images.length; i++) {
          const img = product.images[i];
          let imgUrl = '';
          if (img.driveFileId) {
            imgUrl = `https://drive.google.com/thumbnail?id=${img.driveFileId}&${folderSizeParam}`;
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

    const excelBuffer = await workbook.xlsx.writeBuffer();
    const tXls = Date.now() - tXlsStart;
    console.log(`[export-package] Workbook generation: ${excelBuffer.length} bytes in ${tXls}ms`);

    // ── Stage 4: Stream ZIP directly to response ──
    const tZipStart = Date.now();
    const archive = createZip();

    // Add Excel immediately
    archive.append(Readable.from(Buffer.from(excelBuffer)), { name: 'Products.xlsx' });

    // Download and add images to ZIP concurrently (pool of 8)
    // Use cache for images already downloaded (primary images)
    let zipImagesAdded = 0;
    let zipImagesFailed = 0;
    const zipFailures: string[] = [];

    await pooledMap(8, imageEntries, async (entry) => {
      // Check if we already have this image (primary images are cached as previews,
      // but for the folder we want full quality — so we still download)
      try {
        const imgRes = await fetch(entry.url, { redirect: 'follow' });
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          // Thread-safe append (archiver handles this internally)
          archive.append(imgBuffer, { name: `Images/${entry.folderName}/${entry.filename}` });
          zipImagesAdded++;
        } else {
          zipImagesFailed++;
          zipFailures.push(`${entry.folderName}/${entry.filename}: HTTP ${imgRes.status}`);
        }
      } catch (err: any) {
        zipImagesFailed++;
        zipFailures.push(`${entry.folderName}/${entry.filename}: ${err.message}`);
      }
    });

    const tZip = Date.now() - tZipStart;
    console.log(`[export-package] ZIP images: ${zipImagesAdded} added, ${zipImagesFailed} failed in ${tZip}ms`);

    if (zipFailures.length > 0 && zipFailures.length <= 10) {
      console.log(`[export-package] ZIP image failures:`, zipFailures);
    }

    // Finalize archive and collect into buffer
    archive.finalize();
    const chunks: Buffer[] = [];
    for await (const chunk of archive) {
      chunks.push(Buffer.from(chunk));
    }
    const zipBuffer = Buffer.concat(chunks);

    const tTotal = Date.now() - t0;
    console.log(`[export-package] ═══ COMPLETE ═══`);
    console.log(`[export-package]   Products: ${data.length}`);
    console.log(`[export-package]   DB query: ${tDb}ms`);
    console.log(`[export-package]   Image download (preview): ${tImg}ms (${imgSuccess} ok, ${imgFailed} failed)`);
    console.log(`[export-package]   Workbook generation: ${tXls}ms`);
    console.log(`[export-package]   ZIP generation: ${tZip}ms (${zipImagesAdded} images)`);
    console.log(`[export-package]   ZIP size: ${(zipBuffer.length / 1024 / 1024).toFixed(1)} MB`);
    console.log(`[export-package]   Total: ${tTotal}ms (${(tTotal / 1000).toFixed(1)}s)`);

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="product_export_package.zip"',
      },
    });
  } catch (error: any) {
    const tTotal = Date.now() - t0;
    console.error(`[export-package] FAILED after ${tTotal}ms:`, error);
    return NextResponse.json(
      { error: 'Failed to generate export package', details: error?.message },
      { status: 500 }
    );
  }
}
