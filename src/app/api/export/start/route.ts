import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS, resolveImageLinks, resolveVariants } from '@/lib/lookups';
import { Readable } from 'stream';
import sharp from 'sharp';

export const maxDuration = 300;
export const runtime = 'nodejs';

function createZip() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const archiverModule = require('archiver');
  const ArchiverClass = archiverModule.Archiver || archiverModule.default || archiverModule;
  if (typeof ArchiverClass === 'function') {
    return new ArchiverClass('zip', { zlib: { level: 5 } });
  }
  return archiverModule('zip', { zlib: { level: 5 } });
}

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

/**
 * POST /api/export/start
 *
 * Creates an export job, runs the export in the background, and returns
 * the job ID immediately. The frontend polls /api/export/[id]/status
 * for progress, then downloads from /api/export/[id]/download when done.
 *
 * Body:
 *   { exportMode: "excel-package" | "excel-embedded", quality: "high"|"medium"|"low", srFrom?: number, srTo?: number }
 *
 * Returns:
 *   { jobId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const exportMode = body.exportMode || 'excel-package';
    const quality = body.quality || 'high';
    const srFrom = body.srFrom || null;
    const srTo = body.srTo || null;

    // Create the job record
    const job = await db.exportJob.create({
      data: {
        status: 'pending',
        stage: 'Initializing...',
        exportMode,
        quality,
        srFrom: srFrom || null,
        srTo: srTo || null,
      },
    });

    const jobId = job.id;

    // Start the export in the background — DO NOT await
    runExportJob(jobId, exportMode, quality, srFrom, srTo).catch(async (err) => {
      console.error(`[export-job ${jobId}] FATAL:`, err);
      try {
        await db.exportJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            stage: 'Failed',
            errorMessage: err?.message || 'Unknown error',
            completedAt: new Date(),
          },
        });
      } catch {}
    });

    return NextResponse.json({ jobId });
  } catch (error: any) {
    console.error('[export/start] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start export', details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * Run the export job in the background. Updates the database with progress
 * as it goes. The result ZIP is stored as base64 in the `resultBlob` field.
 *
 * For very large exports (>50MB), the base64 approach may hit DB column
 * limits. In that case, we'd need external storage (S3, Vercel Blob).
 * For now, this works for exports up to ~50MB.
 */
async function runExportJob(
  jobId: string,
  exportMode: string,
  quality: string,
  srFrom: number | null,
  srTo: number | null,
) {
  const t0 = Date.now();
  const folderSizeParam = quality === 'high' ? 'sz=w2000' : quality === 'medium' ? 'sz=w1000' : 'sz=w400';
  const previewSizeParam = 'sz=w400';

  // Helper to update job progress
  async function updateProgress(stage: string, percentage: number, extra: any = {}) {
    try {
      await db.exportJob.update({
        where: { id: jobId },
        data: {
          stage,
          percentage: Math.round(percentage),
          ...extra,
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      // Ignore DB update errors — don't let progress tracking crash the export
    }
  }

  await db.exportJob.update({
    where: { id: jobId },
    data: { status: 'processing', startedAt: new Date() },
  });

  // ── Stage 1: Database query ──
  await updateProgress('Loading products from database...', 2);

  const where: any = {};
  if (srFrom != null && srTo != null) {
    where.sourceRow = { gte: srFrom, lte: srTo };
  }

  const data = await db.product.findMany({
    where,
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      original: true,
      variantMemberships: { include: { variantGroup: true } },
    },
    orderBy: { sourceRow: 'asc' },
  });

  const totalProducts = data.length;
  console.log(`[export-job ${jobId}] Found ${totalProducts} products`);

  if (totalProducts === 0) {
    await db.exportJob.update({
      where: { id: jobId },
      data: { status: 'failed', stage: 'No products found', errorMessage: 'No products to export', completedAt: new Date() },
    });
    return;
  }

  // Count total images
  const allImageEntries: { folderName: string; filename: string; url: string }[] = [];
  for (const product of data) {
    const p = product as any;
    const folderName = p.ndNumber?.trim() ||
      (p.barcode ? `Barcode_${p.barcode}` : `Product_${p.productId || p.sourceRow}`);
    if (p.images && p.images.length > 0) {
      for (let i = 0; i < p.images.length; i++) {
        const img = p.images[i];
        let imgUrl = '';
        if (img.driveFileId) imgUrl = `https://drive.google.com/thumbnail?id=${img.driveFileId}&${folderSizeParam}`;
        else if (img.thumbnailUrl) imgUrl = img.thumbnailUrl;
        else if (img.imageUrl && !img.imageUrl.startsWith('data:')) imgUrl = img.imageUrl;
        if (imgUrl) {
          const filename = img.isPrimary ? 'primary.jpg' : `image${i + 1}.jpg`;
          allImageEntries.push({ folderName, filename, url: imgUrl });
        }
      }
    }
  }

  const totalImages = allImageEntries.length;
  await updateProgress('Preparing image downloads...', 5, { totalProducts, totalImages });

  // ── Stage 2: Download primary images for embedding ──
  const primaryImageTasks = data.map((product: any, index: number) => ({
    product, index,
    image: product.images?.find((img: any) => img.isPrimary) || product.images?.[0] || null,
  })).filter(t => t.image !== null);

  const imageCache = new Map<string, Buffer>();
  let primaryDownloaded = 0;
  const totalPrimary = primaryImageTasks.length;

  await updateProgress('Downloading primary images for embedding...', 8, { totalImages });

  await pooledMap(8, primaryImageTasks, async (task) => {
    const { image } = task;
    const cacheKey = image.driveFileId || image.imageUrl || `${task.product.id}_${task.index}`;
    if (imageCache.has(cacheKey)) {
      primaryDownloaded++;
      return;
    }

    let previewUrl = '';
    if (image.driveFileId) previewUrl = `https://drive.google.com/thumbnail?id=${image.driveFileId}&${previewSizeParam}`;
    else if (image.thumbnailUrl) previewUrl = image.thumbnailUrl;
    else if (image.imageUrl && !image.imageUrl.startsWith('data:')) previewUrl = image.imageUrl;

    if (!previewUrl) { primaryDownloaded++; return; }

    try {
      const imgRes = await fetch(previewUrl, { redirect: 'follow' });
      if (imgRes.ok) {
        const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
        let previewBuffer = rawBuffer;
        try {
          previewBuffer = await sharp(rawBuffer)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        } catch { previewBuffer = rawBuffer; }
        imageCache.set(cacheKey, previewBuffer);
      }
    } catch (err) {
      console.warn(`[export-job ${jobId}] Primary image download failed: ${err}`);
    }

    primaryDownloaded++;
    if (primaryDownloaded % 10 === 0 || primaryDownloaded === totalPrimary) {
      await updateProgress('Downloading primary images for embedding...', 8 + (primaryDownloaded / Math.max(totalPrimary, 1)) * 15, {
        downloadedImages: primaryDownloaded,
      });
    }
  });

  // ── Stage 3: Generate Excel workbook ──
  await updateProgress('Generating Excel workbook...', 25, { downloadedImages: primaryDownloaded });

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Master Catalog');

  const columns: any[] = [
    { header: 'Primary Image', key: '_primaryImage', width: 15 },
    ...COLUMN_DEFS.map((col: any) => ({
      header: col.header, key: col.field,
      width: Math.max(10, Math.min(50, (col.header?.length || 10) + 5)),
    })),
    { header: 'Image Folder', key: '_imageFolder', width: 30 },
  ];
  ws.columns = columns;
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  let processedProducts = 0;

  for (let r = 0; r < data.length; r++) {
    const product = data[r] as any;
    const rowIdx = r + 2;
    const folderName = product.ndNumber?.trim() ||
      (product.barcode ? `Barcode_${product.barcode}` : `Product_${product.productId || product.sourceRow}`);

    const rowData: any = {};
    for (const colDef of COLUMN_DEFS) {
      let value: any;
      if (colDef.field === 'imageLinks') value = resolveImageLinks(product);
      else if (colDef.field === 'variants') value = resolveVariants(product, data);
      else value = product[colDef.field];
      if (typeof value === 'string' && value.length > 32767) {
        value = value.slice(0, 32747) + '... [truncated]';
      }
      rowData[colDef.field] = value === null || value === undefined ? '' : value;
    }
    rowData['_imageFolder'] = `Images/${folderName}`;
    const row = ws.addRow(rowData);
    row.height = 90;

    // Embed primary image
    const primaryImg = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
    if (primaryImg) {
      const cacheKey = primaryImg.driveFileId || primaryImg.imageUrl || `${product.id}_${r}`;
      const cached = imageCache.get(cacheKey);
      if (cached) {
        try {
          const imageId = workbook.addImage({ buffer: cached, extension: 'jpeg' });
          ws.addImage(imageId, { tl: { col: 0, row: rowIdx - 1 }, br: { col: 1, row: rowIdx }, editAs: 'oneCell' });
        } catch {}
      }
    }

    processedProducts = r + 1;
    if (r % 50 === 0 || r === data.length - 1) {
      await updateProgress('Embedding images into Excel...', 25 + (processedProducts / totalProducts) * 25, {
        processedProducts,
      });
    }
  }

  // Free image cache memory
  imageCache.clear();

  const excelBuffer = await workbook.xlsx.writeBuffer();
  await updateProgress('Workbook generated. Creating ZIP package...', 55, { processedProducts: totalProducts });

  // ── Stage 4: Create ZIP with images ──
  const archive = createZip();
  archive.append(Readable.from(Buffer.from(excelBuffer)), { name: 'Products.xlsx' });

  let zipImagesAdded = 0;
  let zipImagesFailed = 0;

  await updateProgress('Downloading images for ZIP folder...', 58, { downloadedImages: 0 });

  await pooledMap(8, allImageEntries, async (entry) => {
    try {
      const imgRes = await fetch(entry.url, { redirect: 'follow' });
      if (imgRes.ok) {
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        archive.append(imgBuffer, { name: `Images/${entry.folderName}/${entry.filename}` });
        zipImagesAdded++;
      } else { zipImagesFailed++; }
    } catch { zipImagesFailed++; }

    const totalDownloaded = zipImagesAdded + zipImagesFailed;
    if (totalDownloaded % 10 === 0 || totalDownloaded === allImageEntries.length) {
      await updateProgress('Downloading images for ZIP folder...', 58 + (totalDownloaded / Math.max(allImageEntries.length, 1)) * 35, {
        downloadedImages: totalDownloaded,
      });
    }
  });

  await updateProgress('Creating ZIP package...', 95);

  archive.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of archive) {
    chunks.push(Buffer.from(chunk));
  }
  const zipBuffer = Buffer.concat(chunks);

  // ── Store result ──
  // Store as base64 in the database (works for exports up to ~50MB)
  const resultBase64 = zipBuffer.toString('base64');
  const resultSize = zipBuffer.length;

  console.log(`[export-job ${jobId}] ZIP generated: ${(resultSize / 1024 / 1024).toFixed(1)} MB`);

  await db.exportJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      stage: 'Completed',
      percentage: 100,
      downloadedImages: zipImagesAdded,
      resultBlob: resultBase64,
      resultSize,
      completedAt: new Date(),
    },
  });

  const tTotal = Date.now() - t0;
  console.log(`[export-job ${jobId}] ═══ COMPLETE in ${(tTotal / 1000).toFixed(1)}s ═══`);
  console.log(`[export-job ${jobId}]   Products: ${totalProducts}, Images: ${zipImagesAdded} ok / ${zipImagesFailed} failed`);
  console.log(`[export-job ${jobId}]   ZIP size: ${(resultSize / 1024 / 1024).toFixed(1)} MB`);
}
