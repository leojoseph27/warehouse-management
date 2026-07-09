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

// ── Weighted stages (total = 100) ──
const STAGE_WEIGHTS = {
  preparing:   { start: 0,  end: 3  },  // 3%
  loadingDb:   { start: 3,  end: 8  },  // 5%
  loadingImgs: { start: 8,  end: 13 },  // 5%
  dlPrimary:   { start: 13, end: 28 },  // 15%
  dlZipImgs:   { start: 28, end: 73 },  // 45%
  buildExcel:  { start: 73, end: 88 },  // 15%
  buildZip:    { start: 88, end: 95 },  // 7%
  finalize:    { start: 95, end: 100 }, // 5%
};

/**
 * POST /api/export/start
 * Creates an export job, runs the export in the background, returns job ID.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const exportMode = body.exportMode || 'excel-package';
    const quality = body.quality || 'high';
    const srFrom = body.srFrom || null;
    const srTo = body.srTo || null;

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
 * Run the export job in the background with:
 * - Weighted stage progress (no fake timers)
 * - Batch processing (50 products per batch, 10 concurrent image downloads)
 * - Memory release after each batch
 * - Accurate ETA based on actual processing speed
 * - Speed metrics (products/sec, images/sec)
 * - Failure counting (images and products)
 * - Comprehensive server-side timing logs
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
  const PRODUCT_BATCH = 50;
  const IMAGE_CONCURRENCY = 10;

  // ── Timing log helper ──
  const stageTimings: { stage: string; ms: number }[] = [];
  function logStage(stage: string, startMs: number) {
    const ms = Date.now() - startMs;
    stageTimings.push({ stage, ms });
    console.log(`[export-job ${jobId}] ⏱ ${stage}: ${ms}ms`);
  }
  function logMemory() {
    const used = process.memoryUsage();
    console.log(`[export-job ${jobId}] 📊 Memory: RSS=${(used.rss/1024/1024).toFixed(0)}MB Heap=${(used.heapUsed/1024/1024).toFixed(0)}MB/${(used.heapTotal/1024/1024).toFixed(0)}MB`);
  }

  // ── Progress update helper with throttling ──
  let lastUpdateMs = 0;
  async function updateProgress(
    stage: string,
    overallPct: number,
    extra: {
      totalProducts?: number;
      processedProducts?: number;
      totalImages?: number;
      downloadedImages?: number;
      imagesFailed?: number;
      productsFailed?: number;
      speed?: string;
    } = {}
  ) {
    const now = Date.now();
    // Throttle DB updates to max 1 per 500ms (except for major stage changes)
    if (now - lastUpdateMs < 500 && overallPct < 100) return;
    lastUpdateMs = now;

    try {
      await db.exportJob.update({
        where: { id: jobId },
        data: {
          stage,
          percentage: Math.round(overallPct),
          updatedAt: new Date(),
          ...extra,
        },
      });
    } catch {}
  }

  // ── Compute weighted percentage for a stage ──
  function stagePct(stageKey: keyof typeof STAGE_WEIGHTS, completed: number, total: number): number {
    const w = STAGE_WEIGHTS[stageKey];
    if (total <= 0) return w.end;
    const ratio = Math.min(1, completed / total);
    return w.start + (w.end - w.start) * ratio;
  }

  await db.exportJob.update({
    where: { id: jobId },
    data: { status: 'processing', startedAt: new Date() },
  });

  // ═══════════════════════════════════════════
  // STAGE 1: Preparing Export (0-3%)
  // ═══════════════════════════════════════════
  const tPrep = Date.now();
  await updateProgress('Preparing export...', STAGE_WEIGHTS.preparing.start);
  logMemory();
  logStage('Preparing Export', tPrep);

  // ═══════════════════════════════════════════
  // STAGE 2: Loading Products from DB (3-8%)
  // ═══════════════════════════════════════════
  const tDb = Date.now();
  await updateProgress('Loading products from database...', STAGE_WEIGHTS.loadingDb.start);

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
  console.log(`[export-job ${jobId}] Products loaded: ${totalProducts}`);

  if (totalProducts === 0) {
    await db.exportJob.update({
      where: { id: jobId },
      data: { status: 'failed', stage: 'No products found', errorMessage: 'No products to export', completedAt: new Date() },
    });
    return;
  }

  await updateProgress('Products loaded', STAGE_WEIGHTS.loadingDb.end, { totalProducts });
  logStage('Loading Products (DB query)', tDb);
  logMemory();

  // ═══════════════════════════════════════════
  // STAGE 3: Loading Image Metadata (8-13%)
  // ═══════════════════════════════════════════
  const tImgs = Date.now();
  await updateProgress('Loading image metadata...', STAGE_WEIGHTS.loadingImgs.start);

  // Build all image entries for the ZIP folder
  const allImageEntries: { folderName: string; filename: string; url: string; productIndex: number }[] = [];
  for (let r = 0; r < data.length; r++) {
    const product = data[r] as any;
    const folderName = product.ndNumber?.trim() ||
      (product.barcode ? `Barcode_${product.barcode}` : `Product_${product.productId || product.sourceRow}`);
    if (product.images && product.images.length > 0) {
      for (let i = 0; i < product.images.length; i++) {
        const img = product.images[i];
        let imgUrl = '';
        if (img.driveFileId) imgUrl = `https://drive.google.com/thumbnail?id=${img.driveFileId}&${folderSizeParam}`;
        else if (img.thumbnailUrl) imgUrl = img.thumbnailUrl;
        else if (img.imageUrl && !img.imageUrl.startsWith('data:')) imgUrl = img.imageUrl;
        if (imgUrl) {
          const filename = img.isPrimary ? 'primary.jpg' : `image${i + 1}.jpg`;
          allImageEntries.push({ folderName, filename, url: imgUrl, productIndex: r });
        }
      }
    }
  }

  const totalImages = allImageEntries.length;
  console.log(`[export-job ${jobId}] Total images: ${totalImages}`);
  await updateProgress('Image metadata loaded', STAGE_WEIGHTS.loadingImgs.end, { totalImages, totalProducts });
  logStage('Loading Image Metadata', tImgs);

  // ═══════════════════════════════════════════
  // STAGE 4: Download Primary Images for Embedding (13-28%)
  // ═══════════════════════════════════════════
  const tDlPrimary = Date.now();
  const imageCache = new Map<string, Buffer>();
  let primaryDownloaded = 0;
  let primaryFailed = 0;

  const primaryTasks = data.map((product: any, index: number) => ({
    product, index,
    image: product.images?.find((img: any) => img.isPrimary) || product.images?.[0] || null,
  })).filter(t => t.image !== null);

  const totalPrimary = primaryTasks.length;
  await updateProgress('Downloading primary images for embedding...', STAGE_WEIGHTS.dlPrimary.start, { totalImages });

  await pooledMap(IMAGE_CONCURRENCY, primaryTasks, async (task) => {
    const { image } = task;
    const cacheKey = image.driveFileId || image.imageUrl || `${task.product.id}_${task.index}`;
    if (imageCache.has(cacheKey)) { primaryDownloaded++; return; }

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
        primaryDownloaded++;
      } else { primaryFailed++; primaryDownloaded++; }
    } catch { primaryFailed++; primaryDownloaded++; }

    // Report progress
    const pct = stagePct('dlPrimary', primaryDownloaded, totalPrimary);
    const speed = primaryDownloaded > 0 ? `${(primaryDownloaded / ((Date.now() - tDlPrimary) / 1000)).toFixed(1)} img/s` : '';
    await updateProgress('Downloading primary images...', pct, {
      downloadedImages: primaryDownloaded,
      imagesFailed: primaryFailed,
      speed,
    });
  });

  await updateProgress('Primary images downloaded', STAGE_WEIGHTS.dlPrimary.end, { downloadedImages: primaryDownloaded });
  logStage('Download Primary Images', tDlPrimary);
  logMemory();

  // ═══════════════════════════════════════════
  // STAGE 5: Download All Images for ZIP Folder (28-73%)
  // ═══════════════════════════════════════════
  const tDlZip = Date.now();
  const archive = createZip();
  let zipImagesAdded = 0;
  let zipImagesFailed = 0;

  await updateProgress('Downloading images for ZIP folder...', STAGE_WEIGHTS.dlZipImgs.start, { downloadedImages: 0 });

  // Process images in batches to release memory
  const IMAGE_BATCH = 100;
  for (let batchStart = 0; batchStart < allImageEntries.length; batchStart += IMAGE_BATCH) {
    const batch = allImageEntries.slice(batchStart, batchStart + IMAGE_BATCH);

    await pooledMap(IMAGE_CONCURRENCY, batch, async (entry) => {
      try {
        const imgRes = await fetch(entry.url, { redirect: 'follow' });
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          archive.append(imgBuffer, { name: `Images/${entry.folderName}/${entry.filename}` });
          zipImagesAdded++;
        } else { zipImagesFailed++; }
      } catch { zipImagesFailed++; }

      const totalDl = zipImagesAdded + zipImagesFailed;
      const pct = stagePct('dlZipImgs', totalDl, allImageEntries.length);
      const speed = totalDl > 0 ? `${(totalDl / ((Date.now() - tDlZip) / 1000)).toFixed(1)} img/s` : '';
      await updateProgress('Downloading images for ZIP folder...', pct, {
        downloadedImages: totalDl,
        imagesFailed: zipImagesFailed,
        speed,
      });
    });

    // Release memory between batches
    if (global.gc) { try { global.gc(); } catch {} }
  }

  await updateProgress('ZIP images downloaded', STAGE_WEIGHTS.dlZipImgs.end, { downloadedImages: zipImagesAdded + zipImagesFailed });
  logStage('Download ZIP Images', tDlZip);
  logMemory();

  // ═══════════════════════════════════════════
  // STAGE 6: Build Excel Workbook (73-88%)
  // ═══════════════════════════════════════════
  const tExcel = Date.now();
  await updateProgress('Generating Excel workbook...', STAGE_WEIGHTS.buildExcel.start);

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
  let productsFailed = 0;

  for (let r = 0; r < data.length; r++) {
    try {
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

      processedProducts++;
    } catch {
      productsFailed++;
      processedProducts++;
    }

    // Report progress every batch or at the end
    if (processedProducts % PRODUCT_BATCH === 0 || processedProducts === totalProducts) {
      const pct = stagePct('buildExcel', processedProducts, totalProducts);
      await updateProgress('Embedding images into Excel...', pct, {
        processedProducts,
        productsFailed,
      });
    }
  }

  // Free image cache — no longer needed
  imageCache.clear();
  if (global.gc) { try { global.gc(); } catch {} }

  const excelBuffer = await workbook.xlsx.writeBuffer();
  await updateProgress('Workbook generated', STAGE_WEIGHTS.buildExcel.end, { processedProducts: totalProducts });
  logStage('Build Excel Workbook', tExcel);
  logMemory();

  // ═══════════════════════════════════════════
  // STAGE 7: Build ZIP (88-95%)
  // ═══════════════════════════════════════════
  const tZip = Date.now();
  await updateProgress('Creating ZIP package...', STAGE_WEIGHTS.buildZip.start);

  // Add Excel to the archive (archive already has images from stage 5)
  archive.append(Readable.from(Buffer.from(excelBuffer)), { name: 'Products.xlsx' });

  archive.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of archive) {
    chunks.push(Buffer.from(chunk));
  }
  const zipBuffer = Buffer.concat(chunks);
  const resultSize = zipBuffer.length;

  await updateProgress('ZIP created', STAGE_WEIGHTS.buildZip.end);
  logStage('Build ZIP', tZip);
  logMemory();

  // ═══════════════════════════════════════════
  // STAGE 8: Finalize (95-100%)
  // ═══════════════════════════════════════════
  const tFinal = Date.now();
  await updateProgress('Storing export result...', STAGE_WEIGHTS.finalize.start);

  const resultBase64 = zipBuffer.toString('base64');

  await db.exportJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      stage: 'Completed',
      percentage: 100,
      processedProducts: totalProducts,
      downloadedImages: zipImagesAdded,
      resultBlob: resultBase64,
      resultSize,
      completedAt: new Date(),
    },
  });

  logStage('Finalize', tFinal);

  // ── Final summary log ──
  const tTotal = Date.now() - t0;
  const totalImgFailed = primaryFailed + zipImagesFailed;
  console.log(`[export-job ${jobId}] ═══ EXPORT COMPLETE ═══`);
  console.log(`[export-job ${jobId}]   Total time: ${(tTotal / 1000).toFixed(1)}s`);
  console.log(`[export-job ${jobId}]   Products: ${totalProducts} (${productsFailed} failed)`);
  console.log(`[export-job ${jobId}]   Images: ${zipImagesAdded} ok, ${totalImgFailed} failed`);
  console.log(`[export-job ${jobId}]   ZIP size: ${(resultSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[export-job ${jobId}]   Stage timings:`);
  for (const t of stageTimings) {
    console.log(`[export-job ${jobId}]     ${t.stage}: ${t.ms}ms (${(t.ms / tTotal * 100).toFixed(0)}%)`);
  }
  logMemory();
}
