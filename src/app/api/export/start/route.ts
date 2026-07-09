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
  preparing:   { start: 0,  end: 3  },
  loadingDb:   { start: 3,  end: 8  },
  loadingImgs: { start: 8,  end: 13 },
  dlPrimary:   { start: 13, end: 28 },
  dlZipImgs:   { start: 28, end: 73 },
  buildExcel:  { start: 73, end: 88 },
  buildZip:    { start: 88, end: 95 },
  finalize:    { start: 95, end: 100 },
};

/**
 * POST /api/export/start
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
    console.log(`[Export ${jobId}] Job created. mode=${exportMode} quality=${quality} srFrom=${srFrom} srTo=${srTo}`);

    // Start the export in the background
    console.log(`[Export ${jobId}] CHECKPOINT 0: About to call runExportJob`);
    runExportJob(jobId, exportMode, quality, srFrom, srTo).catch(async (err) => {
      console.error(`[Export ${jobId}] CHECKPOINT FAILED — runExportJob threw:`, err?.message || err);
      console.error(`[Export ${jobId}] Stack:`, err?.stack);
      try {
        await db.exportJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            stage: 'Failed',
            errorMessage: `${err?.message || 'Unknown error'}\nStack: ${err?.stack || 'N/A'}`,
            completedAt: new Date(),
          },
        });
        console.log(`[Export ${jobId}] Job marked as FAILED in database.`);
      } catch (dbErr: any) {
        console.error(`[Export ${jobId}] Failed to mark job as failed in DB:`, dbErr?.message);
      }
    });
    console.log(`[Export ${jobId}] CHECKPOINT 0.5: runExportJob called (fire-and-forget)`);

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
 * Run the export job. Every step is logged with timestamps.
 * The DB is updated at every milestone — no throttling.
 * A stall detector logs a warning if the same stage hasn't progressed in 30s.
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

  // ── Logging helper ──
  function log(msg: string) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[Export ${jobId}] [${elapsed}s] ${msg}`);
  }

  function logMemory() {
    const used = process.memoryUsage();
    log(`Memory: RSS=${(used.rss/1024/1024).toFixed(0)}MB Heap=${(used.heapUsed/1024/1024).toFixed(0)}MB/${(used.heapTotal/1024/1024).toFixed(0)}MB`);
  }

  // ── DB update helper (NO throttling — always writes) ──
  async function updateDB(
    stage: string,
    percentage: number,
    extra: Record<string, any> = {}
  ) {
    try {
      await db.exportJob.update({
        where: { id: jobId },
        data: {
          stage,
          percentage: Math.round(percentage),
          updatedAt: new Date(),
          ...extra,
        },
      });
    } catch (e: any) {
      log(`⚠ DB update failed: ${e?.message}`);
    }
  }

  // ── Stall detector ──
  let lastProgressStage = '';
  let lastProgressTime = Date.now();
  let lastProgressPct = 0;

  const stallChecker = setInterval(() => {
    const stalledFor = (Date.now() - lastProgressTime) / 1000;
    if (stalledFor > 30) {
      log(`⚠⚠ STALL WARNING: Stage "${lastProgressStage}" has not progressed in ${stalledFor.toFixed(0)}s (last pct=${lastProgressPct}%)`);
      logMemory();
    }
  }, 10000); // Check every 10s, warn if stalled > 30s

  function trackProgress(stage: string, pct: number) {
    if (stage !== lastProgressStage || pct !== lastProgressPct) {
      lastProgressStage = stage;
      lastProgressTime = Date.now();
      lastProgressPct = pct;
    }
  }

  function stagePct(stageKey: keyof typeof STAGE_WEIGHTS, completed: number, total: number): number {
    const w = STAGE_WEIGHTS[stageKey];
    if (total <= 0) return w.end;
    const ratio = Math.min(1, completed / total);
    return w.start + (w.end - w.start) * ratio;
  }

  try {
    log('CHECKPOINT 1: Job started.');
    logMemory();

    log('CHECKPOINT 2: Before marking job as processing in DB');
    try {
      await db.exportJob.update({
        where: { id: jobId },
        data: { status: 'processing', startedAt: new Date() },
      });
      log('CHECKPOINT 2.5: Job marked as processing');
    } catch (e: any) {
      console.error(`[Export ${jobId}] CHECKPOINT 2 FAILED: ${e?.message}`);
      throw e;
    }

    // ═══ STAGE 1: Preparing ═══
    log('CHECKPOINT 3: Preparing export...');
    trackProgress('Preparing export...', 1);
    try {
      await updateDB('Preparing export...', STAGE_WEIGHTS.preparing.start);
      log('CHECKPOINT 3.5: Preparing DB update done');
    } catch (e: any) {
      console.error(`[Export ${jobId}] CHECKPOINT 3 FAILED: ${e?.message}`);
      throw e;
    }

    // ═══ STAGE 2: Database query — PAGINATED, NO EAGER LOADS ═══
    log('CHECKPOINT 4: Starting database query...');
    trackProgress('Querying database...', 3);
    try {
      await updateDB('Querying database...', STAGE_WEIGHTS.loadingDb.start);
      log('CHECKPOINT 4.5: DB status update done');
    } catch (e: any) {
      console.error(`[Export ${jobId}] CHECKPOINT 4 FAILED: ${e?.message}`);
      throw e;
    }

    const where: any = {};
    if (srFrom != null && srTo != null) {
      where.sourceRow = { gte: srFrom, lte: srTo };
    }

    // Step 2a: Count total products (fast query)
    log('CHECKPOINT 5: Before product COUNT query');
    const tCount = Date.now();
    let totalProducts: number;
    try {
      totalProducts = await db.product.count({ where });
      log(`CHECKPOINT 5.5: Product count: ${totalProducts} in ${Date.now() - tCount}ms`);
    } catch (e: any) {
      console.error(`[Export ${jobId}] CHECKPOINT 5 FAILED (count query): ${e?.message}`);
      console.error(`[Export ${jobId}] Stack: ${e?.stack}`);
      throw e;
    }
    if (totalProducts === 0) {
      log('No products found — aborting.');
      clearInterval(stallChecker);
      await db.exportJob.update({
        where: { id: jobId },
        data: { status: 'failed', stage: 'No products found', errorMessage: 'No products to export', completedAt: new Date() },
      });
      return;
    }
    if (Date.now() - tCount > 3000) {
      log(`⚠ COUNT query took ${Date.now() - tCount}ms (>3s warning)`);
    }

    // Step 2b: Load products in BATCHES — no includes
    log('CHECKPOINT 6: Before product batch loading loop');
    const BATCH_SIZE = 200;
    const data: any[] = [];
    const tProducts = Date.now();
    let lastSourceRow: number | null = null;
    let batchNum = 0;

    log(`Loading products in batches of ${BATCH_SIZE} (no eager loads)...`);

    while (true) {
      const batchWhere = { ...where };
      if (lastSourceRow !== null) {
        batchWhere.sourceRow = { ...(where.sourceRow || {}), gt: lastSourceRow };
      }

      const tBatch = Date.now();
      let batch: any[];
      try {
        batch = await db.product.findMany({
          where: batchWhere,
          orderBy: { sourceRow: 'asc' },
          take: BATCH_SIZE,
        });
      } catch (e: any) {
        console.error(`[Export ${jobId}] CHECKPOINT 6 FAILED (batch ${batchNum + 1} findMany): ${e?.message}`);
        console.error(`[Export ${jobId}] Stack: ${e?.stack}`);
        throw e;
      }

      if (batch.length === 0) {
        log(`CHECKPOINT 6.${batchNum}.done: Batch loop complete — no more products`);
        break;
      }

      data.push(...batch);
      lastSourceRow = batch[batch.length - 1].sourceRow;
      batchNum++;

      const batchMs = Date.now() - tBatch;
      log(`CHECKPOINT 6.${batchNum}: Batch ${batchNum} — ${batch.length} products in ${batchMs}ms (total: ${data.length}/${totalProducts})`);
      if (batchMs > 3000) {
        log(`⚠ Batch ${batchNum} took ${batchMs}ms (>3s warning)`);
      }

      const pct = stagePct('loadingDb', data.length, totalProducts);
      trackProgress('Querying database...', pct);
      await updateDB('Querying database...', pct, { totalProducts });
    }

    log(`CHECKPOINT 7: Database query completed in ${Date.now() - tProducts}ms`);
    log(`Products loaded: ${data.length}`);
    logMemory();

    trackProgress('Products loaded', STAGE_WEIGHTS.loadingDb.end);
    await updateDB('Products loaded', STAGE_WEIGHTS.loadingDb.end, { totalProducts: data.length });

    // Step 2c: Load ALL images
    log('CHECKPOINT 8: Before image query');
    const tImages = Date.now();
    let allImages: any[];
    try {
      allImages = await db.productImage.findMany({
        where: {
          productId: { in: data.map((p: any) => p.id) },
        },
        orderBy: [{ productId: 'asc' }, { displayOrder: 'asc' }],
        select: {
          id: true, productId: true, imageUrl: true, thumbnailUrl: true,
          driveFileId: true, isPrimary: true, displayOrder: true,
          filename: true, mimeType: true, fileSize: true,
        },
      });
      log(`CHECKPOINT 8.5: Image query completed in ${Date.now() - tImages}ms — ${allImages.length} images`);
    } catch (e: any) {
      console.error(`[Export ${jobId}] CHECKPOINT 8 FAILED (image query): ${e?.message}`);
      console.error(`[Export ${jobId}] Stack: ${e?.stack}`);
      throw e;
    }
    if (Date.now() - tImages > 3000) {
      log(`⚠ Image query took ${Date.now() - tImages}ms (>3s warning)`);
    }

    // Step 2d: Group images by productId
    log('CHECKPOINT 9: Before image grouping');
    const tGroup = Date.now();
    const imageMap = new Map<string, any[]>();
    for (const img of allImages) {
      const arr = imageMap.get(img.productId) || [];
      arr.push(img);
      imageMap.set(img.productId, arr);
    }
    for (const product of data) {
      product.images = imageMap.get(product.id) || [];
    }
    log(`CHECKPOINT 9.5: Image grouping done in ${Date.now() - tGroup}ms`);
    logMemory();

    // Step 2e: Load variant memberships
    log('CHECKPOINT 10: Before variant memberships query');
    const tVariants = Date.now();
    let allMemberships: any[];
    try {
      allMemberships = await db.variantMember.findMany({
        where: {
          productId: { in: data.map((p: any) => p.id) },
        },
        include: {
          variantGroup: { select: { id: true, primaryProductId: true } },
        },
      });
      log(`CHECKPOINT 10.5: Variant memberships loaded: ${allMemberships.length} in ${Date.now() - tVariants}ms`);
    } catch (e: any) {
      console.error(`[Export ${jobId}] CHECKPOINT 10 FAILED (variant query): ${e?.message}`);
      console.error(`[Export ${jobId}] Stack: ${e?.stack}`);
      throw e;
    }

    // Group memberships by productId
    const membershipMap = new Map<string, any[]>();
    for (const m of allMemberships) {
      const arr = membershipMap.get(m.productId) || [];
      arr.push(m);
      membershipMap.set(m.productId, arr);
    }

    for (const product of data) {
      product.variantMemberships = membershipMap.get(product.id) || [];
    }

    // Free the maps
    imageMap.clear();
    membershipMap.clear();

    const totalImagesCount = allImages.length;
    log(`Total DB loading complete: ${data.length} products, ${totalImagesCount} images, ${allMemberships.length} variant memberships in ${Date.now() - tProducts}ms total`);
    logMemory();

    // Build allImageEntries for the ZIP folder (now that images are attached to products)
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
    log(`Image entries for ZIP: ${totalImages}`);

    // ═══ STAGE 4: Download primary images for embedding ═══
    log('CHECKPOINT 11: Before primary image downloads');
    log('Starting primary image downloads (concurrency=10)...');
    trackProgress('Downloading primary images...', 13);
    await updateDB('Downloading primary images...', STAGE_WEIGHTS.dlPrimary.start, { totalImages });

    const imageCache = new Map<string, Buffer>();
    let primaryDownloaded = 0;
    let primaryFailed = 0;

    const primaryTasks = data.map((product: any, index: number) => ({
      product, index,
      image: product.images?.find((img: any) => img.isPrimary) || product.images?.[0] || null,
    })).filter(t => t.image !== null);

    const totalPrimary = primaryTasks.length;
    log(`Primary images to download: ${totalPrimary}`);

    const tDlPrimary = Date.now();
    await pooledMap(10, primaryTasks, async (task) => {
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
        } else {
          primaryFailed++;
          log(`Primary image download failed: HTTP ${imgRes.status} for ${previewUrl.slice(0, 80)}`);
        }
      } catch (err: any) {
        primaryFailed++;
        log(`Primary image download error: ${err?.message} for ${previewUrl.slice(0, 80)}`);
      }

      primaryDownloaded++;

      // Log every 50 images
      if (primaryDownloaded % 50 === 0 || primaryDownloaded === totalPrimary) {
        const speed = ((primaryDownloaded / ((Date.now() - tDlPrimary) / 1000))).toFixed(1);
        const pct = stagePct('dlPrimary', primaryDownloaded, totalPrimary);
        log(`Downloaded primary image ${primaryDownloaded} / ${totalPrimary} (${speed} img/s, ${primaryFailed} failed)`);
        trackProgress('Downloading primary images...', pct);
        await updateDB('Downloading primary images...', pct, {
          downloadedImages: primaryDownloaded,
          imagesFailed: primaryFailed,
          speed: `${speed} img/s`,
        });
      }
    });

    log(`Primary images done: ${primaryDownloaded} ok, ${primaryFailed} failed in ${Date.now() - tDlPrimary}ms`);
    logMemory();
    trackProgress('Primary images downloaded', STAGE_WEIGHTS.dlPrimary.end);
    await updateDB('Primary images downloaded', STAGE_WEIGHTS.dlPrimary.end, { downloadedImages: primaryDownloaded });

    // ═══ STAGE 5: Download all images for ZIP folder ═══
    log('CHECKPOINT 12: Before ZIP image downloads');
    log('Starting ZIP image downloads (concurrency=10)...');
    trackProgress('Downloading images for ZIP folder...', 28);
    await updateDB('Downloading images for ZIP folder...', STAGE_WEIGHTS.dlZipImgs.start, { downloadedImages: 0 });

    const archive = createZip();
    let zipImagesAdded = 0;
    let zipImagesFailed = 0;
    const tDlZip = Date.now();

    const IMAGE_BATCH = 100;
    for (let batchStart = 0; batchStart < allImageEntries.length; batchStart += IMAGE_BATCH) {
      const batchEnd = Math.min(batchStart + IMAGE_BATCH, allImageEntries.length);
      const batch = allImageEntries.slice(batchStart, batchEnd);
      log(`Processing image batch ${batchStart}-${batchEnd} of ${allImageEntries.length}`);

      await pooledMap(10, batch, async (entry) => {
        try {
          const imgRes = await fetch(entry.url, { redirect: 'follow' });
          if (imgRes.ok) {
            const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
            archive.append(imgBuffer, { name: `Images/${entry.folderName}/${entry.filename}` });
            zipImagesAdded++;
          } else {
            zipImagesFailed++;
          }
        } catch {
          zipImagesFailed++;
        }

        const totalDl = zipImagesAdded + zipImagesFailed;
        if (totalDl % 50 === 0 || totalDl === allImageEntries.length) {
          const speed = ((totalDl / ((Date.now() - tDlZip) / 1000))).toFixed(1);
          const pct = stagePct('dlZipImgs', totalDl, allImageEntries.length);
          log(`Downloaded ZIP image ${totalDl} / ${allImageEntries.length} (${speed} img/s, ${zipImagesFailed} failed)`);
          trackProgress('Downloading images for ZIP folder...', pct);
          await updateDB('Downloading images for ZIP folder...', pct, {
            downloadedImages: totalDl,
            imagesFailed: zipImagesFailed,
            speed: `${speed} img/s`,
          });
        }
      });

      // Release memory between batches
      if (global.gc) { try { global.gc(); } catch {} }
    }

    log(`ZIP images done: ${zipImagesAdded} ok, ${zipImagesFailed} failed in ${Date.now() - tDlZip}ms`);
    logMemory();
    trackProgress('ZIP images downloaded', STAGE_WEIGHTS.dlZipImgs.end);
    await updateDB('ZIP images downloaded', STAGE_WEIGHTS.dlZipImgs.end, { downloadedImages: zipImagesAdded + zipImagesFailed });

    // ═══ STAGE 6: Build Excel workbook ═══
    log('CHECKPOINT 13: Before Excel workbook generation');
    log('Building Excel workbook...');
    trackProgress('Building Excel workbook...', 73);
    await updateDB('Building Excel workbook...', STAGE_WEIGHTS.buildExcel.start);

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
    const tExcel = Date.now();

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
      } catch (err: any) {
        productsFailed++;
        processedProducts++;
        log(`Product ${r + 1} failed: ${err?.message}`);
      }

      // Log + update DB every 50 products
      if (processedProducts % 50 === 0 || processedProducts === totalProducts) {
        const pct = stagePct('buildExcel', processedProducts, totalProducts);
        const speed = ((processedProducts / ((Date.now() - tExcel) / 1000))).toFixed(1);
        log(`Processed product ${processedProducts} / ${totalProducts} (${speed} prod/s)`);
        trackProgress('Building Excel workbook...', pct);
        await updateDB('Building Excel workbook...', pct, {
          processedProducts,
          productsFailed,
          speed: `${speed} prod/s`,
        });
      }
    }

    // Free image cache
    imageCache.clear();
    if (global.gc) { try { global.gc(); } catch {} }

    log(`Workbook rows done: ${processedProducts} products in ${Date.now() - tExcel}ms`);
    log('Generating workbook buffer...');

    const excelBuffer = await workbook.xlsx.writeBuffer();
    log(`Workbook buffer generated: ${(excelBuffer.length / 1024 / 1024).toFixed(1)} MB`);
    logMemory();
    trackProgress('Workbook complete', STAGE_WEIGHTS.buildExcel.end);
    await updateDB('Workbook complete', STAGE_WEIGHTS.buildExcel.end, { processedProducts: totalProducts });

    // ═══ STAGE 7: Build ZIP ═══
    log('CHECKPOINT 14: Before ZIP generation');
    log('Creating ZIP package...');
    trackProgress('Creating ZIP package...', 88);
    await updateDB('Creating ZIP package...', STAGE_WEIGHTS.buildZip.start);

    archive.append(Readable.from(Buffer.from(excelBuffer)), { name: 'Products.xlsx' });
    archive.finalize();

    const chunks: Buffer[] = [];
    for await (const chunk of archive) {
      chunks.push(Buffer.from(chunk));
    }
    const zipBuffer = Buffer.concat(chunks);
    const resultSize = zipBuffer.length;
    log(`ZIP created: ${(resultSize / 1024 / 1024).toFixed(1)} MB`);
    logMemory();
    trackProgress('ZIP complete', STAGE_WEIGHTS.buildZip.end);
    await updateDB('ZIP complete', STAGE_WEIGHTS.buildZip.end);

    // ═══ STAGE 8: Finalize ═══
    log('CHECKPOINT 15: Before storing result in DB');
    log('Storing export result in database...');
    trackProgress('Storing result...', 95);
    await updateDB('Storing result...', STAGE_WEIGHTS.finalize.start);

    const resultBase64 = zipBuffer.toString('base64');
    log(`Base64 encoding done: ${(resultBase64.length / 1024 / 1024).toFixed(1)} MB`);

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

    // ── Final summary ──
    const tTotal = Date.now() - t0;
    const totalFailed = primaryFailed + zipImagesFailed;
    log(`CHECKPOINT 16: Result stored in DB. Export complete.`);
    log('═══ EXPORT COMPLETE ═══');
    log(`  Total time: ${(tTotal / 1000).toFixed(1)}s`);
    log(`  Products: ${totalProducts} (${productsFailed} failed)`);
    log(`  Images: ${zipImagesAdded} ok, ${totalFailed} failed`);
    log(`  ZIP size: ${(resultSize / 1024 / 1024).toFixed(1)} MB`);
    logMemory();

    clearInterval(stallChecker);
  } catch (err: any) {
    clearInterval(stallChecker);
    log(`═══ CHECKPOINT FAILED ═══`);
    log(`  Error: ${err?.message}`);
    log(`  Stack: ${err?.stack}`);
    log(`  Last checkpoint reached: ${lastProgressStage}`);
    log(`  Last percentage: ${lastProgressPct}%`);
    logMemory();
    throw err;
  }
}
