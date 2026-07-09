/**
 * Production-grade chunk worker for the export pipeline.
 *
 * STORAGE POLICY (critical):
 *   - Neon stores ONLY metadata: ExportJob, ExportChunk, ExportLog.
 *   - Image binaries are NEVER persisted to Neon.
 *   - During chunk processing, images are fetched from Google Drive
 *     ONLY to verify they're reachable (for progress display + count).
 *   - During 'building_zip' stage: the final ZIP is built ONCE — Excel
 *     assembled in memory, images streamed from Google Drive into the
 *     archiver, and the archiver output piped directly to Vercel Blob.
 *   - The /download endpoint just streams the pre-built ZIP from Blob.
 *     No rebuild, no image refetch, no Excel regeneration.
 *
 * Pipeline stages (each /process call advances ONE step):
 *   1. created            → run COUNT, set totalProducts. Transition to loading_products.
 *   2. loading_products   → load PRODUCT_BATCH_SIZE products (cursor-based), build image
 *                           manifest, fetch images from Drive (verification + progress),
 *                           persist ExportChunk metadata row. Advance cursor.
 *   3. (after last chunk) → transition to writing_excel (fast).
 *   4. writing_excel      → transition to building_zip (fast).
 *   5. building_zip       → HEAVY: build Excel workbook, stream images from Drive
 *                           into archiver, pipe archiver → Vercel Blob. Set
 *                           blobUrl, fileSize, blobExpiresAt. Transition to saving_package.
 *   6. saving_package     → mark status=completed, set downloadUrl + completedAt.
 *
 * RESUMABILITY:
 *   - The `cursor` field on ExportJob stores the last successfully committed
 *     sourceRow. If a /process call fails or the browser closes, the next
 *     call picks up from cursor+1.
 *   - If a chunk fails (DB error or unexpected throw), it is NOT committed.
 *     The cursor stays at the previous chunk's lastSourceRow, so the next
 *     /process call re-attempts the same chunk. After MAX_CHUNK_RETRIES
 *     consecutive failures, the job is marked failed.
 *
 * CHUNK RETRY:
 *   - Each /process call tracks retry count via the `failedChunkCount`
 *     field on ExportJob. A successful chunk resets it to 0.
 *   - If failedChunkCount >= MAX_CHUNK_RETRIES, the job is marked failed
 *     with a clear error message.
 */

import { db } from '@/lib/db';
import {
  PRODUCT_BATCH_SIZE,
  IMAGE_DOWNLOAD_CONCURRENCY,
  MAX_IMAGES_PER_CHUNK,
  MAX_CHUNK_RETRIES,
  buildWhereClause,
  resolveFolderName,
  stagePct,
  pooledMap,
  qualityToSizeParam,
  qualityToAvgBytes,
  buildProcessResponse,
  getMemoryUsageMb,
  STAGE_LABELS,
  type ProcessChunkResponse,
} from '@/lib/export-helpers';
import { createExportLogger } from '@/lib/export-logger';
import { COLUMN_DEFS, resolveImageLinksForExport, resolveVariants } from '@/lib/lookups';
import {
  uploadExportFile,
  computeBlobExpiresAt,
} from '@/lib/export-storage';
import ExcelJS from 'exceljs';
import { ZipArchive } from 'archiver';

// ─────────────────────────────────────────────────────────────
// Stage dispatcher
// ─────────────────────────────────────────────────────────────

export async function runChunkWorker(
  jobId: string,
  _clientCursor: number | null,
): Promise<ProcessChunkResponse> {
  const logger = createExportLogger(jobId);

  const job = await db.exportJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return {
      status: 'failed',
      stage: 'Job not found',
      percentage: 0,
      totalProducts: 0,
      processedProducts: 0,
      totalImages: 0,
      downloadedImages: 0,
      failedImages: 0,
      chunkCount: 0,
      currentChunk: null,
      nextCursor: null,
      eta: '00:00',
      speed: '',
      estimatedSizeBytes: null,
      fileSize: null,
      blobExpiresAt: null,
      downloadUrl: null,
      done: true,
      error: 'Job not found',
    };
  }

  // Terminal states — refuse to do more work.
  if (['cancelled', 'completed', 'failed'].includes(job.status)) {
    return buildProcessResponse(job);
  }

  await logger.info('process', `Chunk worker invoked`, {
    status: job.status,
    stage: job.stage,
    cursor: job.cursor,
    chunkCount: job.chunkCount,
    failedChunkCount: job.failedChunkCount,
  });

  // ── Check retry budget ──
  if (job.failedChunkCount >= MAX_CHUNK_RETRIES) {
    const msg = `Export failed after ${MAX_CHUNK_RETRIES} consecutive chunk failures.`;
    await db.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        stage: STAGE_LABELS.failed,
        errorMessage: msg,
        completedAt: new Date(),
      },
    });
    await logger.error('process', msg, { failedChunkCount: job.failedChunkCount });
    const fresh = await db.exportJob.findUnique({ where: { id: jobId } });
    return buildProcessResponse(fresh || job);
  }

  // Brief optimistic lock — mark as 'processing' to discourage concurrent calls.
  await db.exportJob.update({
    where: { id: jobId },
    data: { status: 'processing', updatedAt: new Date() },
  }).catch(() => {});

  const freshJob = await db.exportJob.findUnique({ where: { id: jobId } });
  if (!freshJob) return buildProcessResponse(job);

  // ── LIFECYCLE LOG: before stage dispatch ──
  console.log(`[Export ${jobId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[Export ${jobId}] BEFORE stage dispatch:`);
  console.log(`  jobId:              ${jobId}`);
  console.log(`  status:             ${freshJob.status}`);
  console.log(`  stage:              "${freshJob.stage}"`);
  console.log(`  cursor:             ${freshJob.cursor}`);
  console.log(`  chunkCount:         ${freshJob.chunkCount}`);
  console.log(`  processedProducts:  ${freshJob.processedProducts} / ${freshJob.totalProducts}`);
  console.log(`  downloadedImages:   ${freshJob.downloadedImages} / ${freshJob.totalImages}`);
  console.log(`  percentage:         ${freshJob.percentage}%`);
  console.log(`  blobUrl:            ${freshJob.blobUrl || '(not set)'}`);
  console.log(`  fileSize:           ${freshJob.fileSize || '(not set)'}`);
  console.log(`  downloadUrl:        ${freshJob.downloadUrl || '(not set)'}`);
  console.log(`[Export ${jobId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const chunkStartTime = Date.now();
  let chunkSucceeded = false;

  try {
    const stageBefore = freshJob.stage;
    console.log(`[Export ${jobId}] Dispatching stage: "${stageBefore}"`);

    switch (freshJob.stage) {
      case '':
      case STAGE_LABELS.preparing:
      case 'Initializing...':
        console.log(`[Export ${jobId}] TRANSITION: "${stageBefore}" → handleStageCreated → "Loading products..."`);
        await handleStageCreated(freshJob, logger);
        break;

      case STAGE_LABELS.loadingProducts:
      case 'Loading products...':
        console.log(`[Export ${jobId}] TRANSITION: "${stageBefore}" → handleStageLoadingProducts`);
        await handleStageLoadingProducts(freshJob, logger);
        break;

      case STAGE_LABELS.downloadingImages:
      case 'Downloading images...':
        console.log(`[Export ${jobId}] TRANSITION: "${stageBefore}" → transitionToWritingExcel → "Writing Excel..."`);
        await transitionToWritingExcel(freshJob, logger);
        break;

      case STAGE_LABELS.writingExcel:
      case 'Writing Excel...':
        console.log(`[Export ${jobId}] TRANSITION: "${stageBefore}" → transitionToBuildingZip (HEAVY: builds Excel + ZIP + uploads Blob) → "Saving package..."`);
        await transitionToBuildingZip(freshJob, logger);
        break;

      case STAGE_LABELS.buildingZip:
      case 'Building ZIP...':
        // This case should NOT normally be hit because transitionToBuildingZip
        // runs to completion (setting stage directly to saving_package) in one
        // request. If we're here, the previous request timed out mid-build.
        console.log(`[Export ${jobId}] WARNING: stage is "Building ZIP..." — previous request may have timed out mid-build. Retrying the build.`);
        console.log(`[Export ${jobId}] TRANSITION: "${stageBefore}" → transitionToBuildingZip (retry) → "Saving package..."`);
        await transitionToBuildingZip(freshJob, logger);
        break;

      case STAGE_LABELS.savingPackage:
      case 'Saving package...':
        console.log(`[Export ${jobId}] TRANSITION: "${stageBefore}" → handleStageCompleted → "Completed"`);
        await handleStageCompleted(freshJob, logger);
        break;

      default:
        console.warn(`[Export ${jobId}] Unknown stage "${freshJob.stage}" — treating as created.`);
        await handleStageCreated(freshJob, logger);
    }

    chunkSucceeded = true;
    console.log(`[Export ${jobId}] ✓ Stage handler completed successfully (${Date.now() - chunkStartTime}ms)`);
  } catch (err: any) {
    const elapsedMs = Date.now() - chunkStartTime;
    console.error(`[Export ${jobId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.error(`[Export ${jobId}] ✗ STAGE HANDLER FAILED after ${elapsedMs}ms`);
    console.error(`[Export ${jobId}]   stage:      "${freshJob.stage}"`);
    console.error(`[Export ${jobId}]   error:      ${err?.message}`);
    console.error(`[Export ${jobId}]   code:       ${err?.code}`);
    console.error(`[Export ${jobId}]   stack:      ${err?.stack}`);
    console.error(`[Export ${jobId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    await logger.error('process', `Chunk failed: ${err?.message || 'Unknown error'}`, {
      stage: freshJob.stage,
      cursor: freshJob.cursor,
      chunkCount: freshJob.chunkCount,
      elapsedMs,
      stack: err?.stack,
    });

    // Increment failedChunkCount so the retry budget kicks in.
    await db.exportJob.update({
      where: { id: jobId },
      data: {
        failedChunkCount: { increment: 1 },
        errorMessage: `${err?.message || 'Unknown error'}\nStack: ${err?.stack || 'N/A'}`,
      },
    }).catch(() => {});
  } finally {
    // On success, reset the failed chunk counter so the budget only counts
    // CONSECUTIVE failures, not total lifetime failures.
    if (chunkSucceeded) {
      await db.exportJob.update({
        where: { id: jobId },
        data: {
          failedChunkCount: 0,
          elapsedMs: { increment: Date.now() - chunkStartTime },
        },
      }).catch(() => {});
    }
  }

  // ── LIFECYCLE LOG: after stage dispatch ──
  const finalJob = await db.exportJob.findUnique({ where: { id: jobId } });
  if (finalJob) {
    console.log(`[Export ${jobId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[Export ${jobId}] AFTER stage dispatch:`);
    console.log(`  jobId:              ${finalJob.id}`);
    console.log(`  status:             ${finalJob.status}`);
    console.log(`  stage:              "${finalJob.stage}"`);
    console.log(`  cursor:             ${finalJob.cursor}`);
    console.log(`  chunkCount:         ${finalJob.chunkCount}`);
    console.log(`  processedProducts:  ${finalJob.processedProducts} / ${finalJob.totalProducts}`);
    console.log(`  downloadedImages:   ${finalJob.downloadedImages} / ${finalJob.totalImages}`);
    console.log(`  percentage:         ${finalJob.percentage}%`);
    console.log(`  blobUrl:            ${finalJob.blobUrl || '(not set)'}`);
    console.log(`  fileSize:           ${finalJob.fileSize || '(not set)'}`);
    console.log(`  downloadUrl:        ${finalJob.downloadUrl || '(not set)'}`);
    console.log(`  failedChunkCount:   ${finalJob.failedChunkCount}`);
    if (finalJob.status === 'completed') {
      console.log(`[Export ${jobId}] ✓✓✓ JOB COMPLETED ✓✓✓`);
      console.log(`  ZIP uploaded successfully`);
      console.log(`  Blob URL:           ${finalJob.blobUrl}`);
      console.log(`  File size:          ${finalJob.fileSize} bytes (${(finalJob.fileSize! / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`  Download URL:       ${finalJob.downloadUrl}`);
    }
    console.log(`[Export ${jobId}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }
  return buildProcessResponse(finalJob || job);
}

// ─────────────────────────────────────────────────────────────
// Stage: created → loading_products
// ─────────────────────────────────────────────────────────────

async function handleStageCreated(job: any, logger: ReturnType<typeof createExportLogger>) {
  const where = buildWhereClause(job.srFrom, job.srTo);

  await logger.info('stage-created', 'Counting products...', { where });

  const tCount = Date.now();
  const totalProducts = await db.product.count({ where });
  const dbMs = Date.now() - tCount;

  await logger.info('stage-created', `Count complete`, { totalProducts, dbMs });

  if (totalProducts === 0) {
    await db.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        stage: STAGE_LABELS.failed,
        errorMessage: 'No products match the selected filters.',
        completedAt: new Date(),
      },
    });
    await logger.warn('stage-created', 'No products found — job failed.');
    return;
  }

  // Estimate total images by sampling (fast — uses index on productId).
  const sampleProductIds = await db.product.findMany({
    where,
    select: { id: true },
    take: 100,
    orderBy: { sourceRow: 'asc' },
  });
  const sampleImageCount = await db.productImage.count({
    where: { productId: { in: sampleProductIds.map((p: any) => p.id) } },
  });
  const avgImagesPerProduct = sampleProductIds.length > 0
    ? sampleImageCount / sampleProductIds.length
    : 0;
  const estimatedTotalImages = Math.round(avgImagesPerProduct * totalProducts);
  const estimatedSizeBytes = Math.round(
    estimatedTotalImages * qualityToAvgBytes(job.quality)
  );

  await db.exportJob.update({
    where: { id: job.id },
    data: {
      status: 'processing',
      stage: STAGE_LABELS.loadingProducts,
      totalProducts,
      totalImages: estimatedTotalImages,
      estimatedSizeBytes,
      startedAt: new Date(),
      percentage: Math.round(stagePct('loadingProducts', 0, totalProducts)),
    },
  });

  await logger.info('stage-created', 'Transitioned to loading_products', {
    totalProducts,
    estimatedTotalImages,
    estimatedSizeBytes,
    avgImagesPerProduct: avgImagesPerProduct.toFixed(2),
  });
}

// ─────────────────────────────────────────────────────────────
// Stage: loading_products — load ONE batch, persist ExportChunk metadata
// ─────────────────────────────────────────────────────────────

async function handleStageLoadingProducts(
  job: any,
  logger: ReturnType<typeof createExportLogger>,
) {
  const where = buildWhereClause(job.srFrom, job.srTo);

  // Cursor-based pagination: load products with sourceRow > cursor.
  const batchWhere = { ...where };
  if (job.cursor != null) {
    batchWhere.sourceRow = {
      ...(where.sourceRow || {}),
      gt: job.cursor,
    };
  }

  const tDbStart = Date.now();
  const batch = await db.product.findMany({
    where: batchWhere,
    orderBy: { sourceRow: 'asc' },
    take: PRODUCT_BATCH_SIZE,
  });
  const dbMs = Date.now() - tDbStart;

  await logger.info('stage-loading', `Batch loaded`, {
    cursor: job.cursor,
    batchSize: batch.length,
    dbMs,
  });

  if (batch.length === 0) {
    // No more products — transition to downloading_images (which will
    // immediately transition to writing_excel since all chunks are done).
    await db.exportJob.update({
      where: { id: job.id },
      data: {
        stage: STAGE_LABELS.downloadingImages,
        percentage: Math.round(stagePct('downloadingImages', 1, 1)),
      },
    });
    await logger.info('stage-loading', 'All products loaded — transitioning to downloading_images');
    return;
  }

  // Load images + variant memberships for this batch only.
  const productIds = batch.map((p: any) => p.id);

  const tImgQueryStart = Date.now();
  const [images, memberships] = await Promise.all([
    db.productImage.findMany({
      where: { productId: { in: productIds } },
      orderBy: [{ productId: 'asc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        productId: true,
        imageUrl: true,
        thumbnailUrl: true,
        driveFileId: true,
        isPrimary: true,
        displayOrder: true,
        filename: true,
        mimeType: true,
        fileSize: true,
      },
    }),
    db.variantMember.findMany({
      where: { productId: { in: productIds } },
      include: {
        variantGroup: { select: { id: true, primaryProductId: true } },
      },
    }),
  ]);
  const imgQueryMs = Date.now() - tImgQueryStart;
  const totalDbMs = dbMs + imgQueryMs;

  // Attach to products (in-memory only).
  const imageMap = new Map<string, any[]>();
  for (const img of images) {
    const arr = imageMap.get(img.productId) || [];
    arr.push(img);
    imageMap.set(img.productId, arr);
  }
  const membershipMap = new Map<string, any[]>();
  for (const m of memberships) {
    const arr = membershipMap.get(m.productId) || [];
    arr.push(m);
    membershipMap.set(m.productId, arr);
  }
  for (const product of batch) {
    (product as any).images = imageMap.get(product.id) || [];
    (product as any).variantMemberships = membershipMap.get(product.id) || [];
  }

  // Build image manifest: every image we'll include in the ZIP.
  // This manifest is persisted in ExportChunk.imageManifestJson and used
  // later by /download to stream images from Drive.
  const folderSizeParam = qualityToSizeParam(job.quality);
  type ImageManifestEntry = {
    folder: string;
    filename: string;
    driveFileId: string | null;
    url: string;
    isPrimary: boolean;
  };
  const imageManifest: ImageManifestEntry[] = [];
  for (const product of batch) {
    const folder = resolveFolderName(product);
    const imgs = (product as any).images || [];
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      let url = '';
      if (img.driveFileId) {
        url = `https://drive.google.com/thumbnail?id=${img.driveFileId}&${folderSizeParam}`;
      } else if (img.thumbnailUrl) {
        url = img.thumbnailUrl;
      } else if (img.imageUrl && !img.imageUrl.startsWith('data:')) {
        url = img.imageUrl;
      }
      if (!url) continue;
      const filename = img.isPrimary ? 'primary.jpg' : `image${i + 1}.jpg`;
      imageManifest.push({
        folder,
        filename,
        driveFileId: img.driveFileId || null,
        url,
        isPrimary: !!img.isPrimary,
      });
    }
  }

  // Cap images per chunk (only affects verification downloads, not the
  // final ZIP — /download fetches all manifest entries regardless of cap).
  const cappedManifest = imageManifest.slice(0, MAX_IMAGES_PER_CHUNK);

  // Verify image reachability by downloading a sample (for progress display).
  // We don't persist binaries — only count successes/failures.
  const tDriveStart = Date.now();
  let dlOk = 0;
  let dlFail = 0;

  await pooledMap(IMAGE_DOWNLOAD_CONCURRENCY, cappedManifest, async (entry) => {
    try {
      const res = await fetch(entry.url, { redirect: 'follow' });
      if (!res.ok || res.body === null) {
        dlFail++;
        return;
      }
      // Drain the body to verify the fetch completed. We intentionally
      // don't keep the bytes — they're not stored in Neon.
      // Read a small prefix only to confirm the response is real.
      const reader = res.body.getReader();
      try {
        await reader.read();
      } finally {
        reader.releaseLock();
      }
      dlOk++;
    } catch (err: any) {
      await logger.warn('stage-loading', `Image verify failed: ${entry.folder}/${entry.filename}`, {
        url: entry.url.slice(0, 100),
        error: err?.message,
      });
      dlFail++;
    }
  });
  const driveMs = Date.now() - tDriveStart;

  // Pre-compute Excel rows for this chunk. Persisted as JSON in ExportChunk
  // so /download can reassemble without re-querying the DB.
  // NOTE: variants column is left blank here — resolved during /download
  // when we have the full product set across all chunks.
  //
  // EXCLUDED COLUMNS (removed from export per requirements):
  //   - minSalesMultiples
  //   - validationStatus
  //   - confidenceScore
  // These are filtered out of COLUMN_DEFS before iteration.
  const EXCLUDED_COLUMN_FIELDS = new Set([
    'minSalesMultiples',
    'validationStatus',
    'confidenceScore',
  ]);
  const exportColumnDefs = COLUMN_DEFS.filter(
    (c: any) => !EXCLUDED_COLUMN_FIELDS.has(c.field)
  );

  // Determine the size param for Google Drive thumbnail URLs in Image Links.
  // For excel-thumbnails mode, use the thumbnail quality. For other modes,
  // use a default medium size.
  const imageLinksSizeParam = job.exportMode === 'excel-thumbnails'
    ? qualityToSizeParam(job.quality)
    : 'sz=w1000';

  const tExcelStart = Date.now();
  const excelRows: any[] = [];
  for (const product of batch) {
    const rowData: any = {};
    for (const colDef of exportColumnDefs) {
      let value: any;
      if (colDef.field === 'imageLinks') {
        // Build Image Links column: newline-separated Google Drive thumbnail URLs,
        // primary image first, then remaining images in display order.
        value = resolveImageLinksForExport(product as any, imageLinksSizeParam);
      } else if (colDef.field === 'variants') {
        value = ''; // resolved during /download
      } else {
        value = (product as any)[colDef.field];
      }
      if (typeof value === 'string' && value.length > 32767) {
        value = value.slice(0, 32747) + '... [truncated]';
      }
      rowData[colDef.field] = value === null || value === undefined ? '' : value;
    }
    // Internal: needed for variant resolution during /download.
    // These are NOT written to Excel — they're stripped before addRow.
    rowData['_productId'] = product.id;
    rowData['_variantMemberships'] = (product as any).variantMemberships || [];
    excelRows.push(rowData);
  }
  const excelMs = Date.now() - tExcelStart;

  // Persist ExportChunk metadata row.
  const chunkNumber = (job.chunkCount || 0) + 1;
  const firstSourceRow = batch[0].sourceRow ?? null;
  const lastSourceRow = batch[batch.length - 1].sourceRow ?? null;
  const mem = getMemoryUsageMb();
  const totalMs = Date.now() - tDbStart;

  await db.exportChunk.create({
    data: {
      jobId: job.id,
      chunkNumber,
      firstSourceRow,
      lastSourceRow,
      status: 'completed',
      productCount: batch.length,
      imageCount: imageManifest.length,
      imagesDownloaded: dlOk,
      productIdsJson: JSON.stringify(productIds),
      imageManifestJson: JSON.stringify(imageManifest),
      excelRowsJson: JSON.stringify(excelRows),
      dbMs: totalDbMs,
      driveMs,
      excelMs,
      totalMs,
      memoryMb: mem.heap,
      completedAt: new Date(),
    },
  });

  // Update progress on the job.
  const newProcessedProducts = (job.processedProducts || 0) + batch.length;
  const newDownloadedImages = (job.downloadedImages || 0) + dlOk;
  const newFailedImages = (job.failedImages || 0) + dlFail;
  const newTotalImages = (job.totalImages || 0) + imageManifest.length;
  const isLastBatch = batch.length < PRODUCT_BATCH_SIZE;

  const percentage = isLastBatch
    ? stagePct('downloadingImages', 1, 1)
    : stagePct('loadingProducts', newProcessedProducts, job.totalProducts);

  await db.exportJob.update({
    where: { id: job.id },
    data: {
      status: 'processing',
      stage: isLastBatch ? STAGE_LABELS.downloadingImages : STAGE_LABELS.loadingProducts,
      percentage: Math.round(percentage),
      processedProducts: newProcessedProducts,
      downloadedImages: newDownloadedImages,
      failedImages: newFailedImages,
      totalImages: newTotalImages,
      cursor: lastSourceRow,
      chunkCount: chunkNumber,
    },
  });

  await logger.info('stage-loading', `Chunk ${chunkNumber} persisted`, {
    chunkNumber,
    productCount: batch.length,
    imageCount: imageManifest.length,
    imagesDownloaded: dlOk,
    imagesFailed: dlFail,
    firstSourceRow,
    lastSourceRow,
    isLastBatch,
    dbMs: totalDbMs,
    driveMs,
    excelMs,
    totalMs,
    memoryMb: mem.heap,
    memoryRss: mem.rss,
  });
}

// ─────────────────────────────────────────────────────────────
// Stage: writing_excel — fast transition
//
// All chunks are loaded. The next stage (building_zip) does the heavy
// work of assembling Excel + streaming images from Drive into the ZIP.
// ─────────────────────────────────────────────────────────────

async function transitionToWritingExcel(
  job: any,
  logger: ReturnType<typeof createExportLogger>,
) {
  await db.exportJob.update({
    where: { id: job.id },
    data: {
      stage: STAGE_LABELS.writingExcel,
      percentage: Math.round(stagePct('writingExcel', 0, 1)),
    },
  });
  await logger.info('stage-transition', '→ writing_excel (all chunks loaded)');
}

// ─────────────────────────────────────────────────────────────
// Stage: building_zip — HEAVY WORK
//
// This is the only stage that does real work in the finalize phase.
// It builds the Excel workbook, streams all images from Google Drive
// into a ZIP archiver, and pipes the archiver output directly to
// Vercel Blob. The result is a pre-built ZIP that the /download
// endpoint can stream instantly.
//
// Memory profile:
//   - Excel workbook: ~1-5 MB for 2,500 products (in memory).
//   - Image fetches: bounded by IMAGE_DOWNLOAD_CONCURRENCY (5 in flight).
//   - Archiver output: streamed to Blob, not buffered.
//   - Peak heap: ~50-100 MB for typical exports.
// ─────────────────────────────────────────────────────────────

async function transitionToBuildingZip(
  job: any,
  logger: ReturnType<typeof createExportLogger>,
) {
  const tStageStart = Date.now();
  const memBefore = getMemoryUsageMb();

  await logger.info('stage-building-zip', 'Starting ZIP generation', {
    memoryBeforeMb: memBefore.heap,
    memoryRssBeforeMb: memBefore.rss,
  });

  // Update stage to show progress.
  await db.exportJob.update({
    where: { id: job.id },
    data: {
      stage: STAGE_LABELS.buildingZip,
      percentage: Math.round(stagePct('buildingZip', 0, 4)),
    },
  });

  // ── Load all chunks in order ──
  const chunks = await db.exportChunk.findMany({
    where: { jobId: job.id, status: 'completed' },
    orderBy: { chunkNumber: 'asc' },
    select: {
      chunkNumber: true,
      excelRowsJson: true,
      imageManifestJson: true,
      productCount: true,
      imageCount: true,
    },
  });

  if (chunks.length === 0) {
    await db.exportJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        stage: 'No data',
        errorMessage: 'No product chunks found — job may have been reset.',
        completedAt: new Date(),
      },
    });
    await logger.error('stage-building-zip', 'No chunks found');
    return;
  }

  await logger.info('stage-building-zip', `Loaded ${chunks.length} chunks`);

  // ── Parse all chunks ONCE ──
  type ParsedChunk = {
    chunkNumber: number;
    rows: any[];
    images: { folder: string; filename: string; driveFileId: string | null; url: string; isPrimary: boolean }[];
  };
  const parsedChunks: ParsedChunk[] = chunks.map((c: any) => ({
    chunkNumber: c.chunkNumber,
    rows: JSON.parse(c.excelRowsJson),
    images: JSON.parse(c.imageManifestJson),
  }));

  // ── Build product ref map for variant resolution ──
  type ProductRef = {
    id: string;
    ndNumber: string | null;
    barcode: string | null;
    variantMemberships: any[];
  };
  const allProductRefs: ProductRef[] = [];
  for (const chunk of parsedChunks) {
    for (const row of chunk.rows) {
      allProductRefs.push({
        id: row._productId,
        ndNumber: row.ndNumber || null,
        barcode: row.barcode || null,
        variantMemberships: row._variantMemberships || [],
      });
    }
  }
  const productRefMap = new Map(allProductRefs.map((p) => [p.id, p]));

  await db.exportJob.update({
    where: { id: job.id },
    data: { percentage: Math.round(stagePct('buildingZip', 1, 4)) },
  });

  // ── Build Excel workbook ──
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Master Catalog');

  const isThumbnailsMode = job.exportMode === 'excel-thumbnails';

  // ── Excluded columns (removed from all export modes per requirements) ──
  const EXCLUDED_COLUMN_FIELDS = new Set([
    'minSalesMultiples',
    'validationStatus',
    'confidenceScore',
  ]);
  const exportColumnDefs = COLUMN_DEFS.filter(
    (c: any) => !EXCLUDED_COLUMN_FIELDS.has(c.field)
  );

  // For excel-thumbnails mode, check if the Primary Image column should be
  // included (only if at least one product has an imageLinks value).
  let skipPrimaryImageColumn = false;
  if (isThumbnailsMode) {
    let anyImageLinks = false;
    for (const chunk of parsedChunks) {
      for (const row of chunk.rows) {
        if ((row as any).imageLinks) {
          anyImageLinks = true;
          break;
        }
      }
      if (anyImageLinks) break;
    }
    if (!anyImageLinks) {
      skipPrimaryImageColumn = true;
      console.log(`[Export ${job.id}] Skipping Primary Image column — no products have image URLs`);
    }
  }

  // ── Column definitions ──
  // For excel-thumbnails mode: 'Primary Image' column first, then product columns.
  // No extra image columns — all image data is in the Image Links column.
  // Column width ~15 chars ≈ 105px. Row height set per-row to 60 ≈ 80px.
  const columns: any[] = [];
  if (isThumbnailsMode && !skipPrimaryImageColumn) {
    columns.push({ header: 'Primary Image', key: '_primaryImage', width: 15 });
  }
  columns.push(
    ...exportColumnDefs.map((col: any) => ({
      header: col.header,
      key: col.field,
      width: Math.max(10, Math.min(50, (col.header?.length || 10) + 5)),
    })),
  );
  ws.columns = columns;
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  const tExcelStart = Date.now();
  let totalRowsWritten = 0;
  let thumbnailsAdded = 0;
  for (const chunk of parsedChunks) {
    for (const row of chunk.rows) {
      const productRef = productRefMap.get(row._productId);
      if (productRef) {
        const fakeProduct: any = {
          id: productRef.id,
          ndNumber: productRef.ndNumber,
          barcode: productRef.barcode,
          variantMemberships: productRef.variantMemberships,
        };
        row.variants = resolveVariants(fakeProduct, allProductRefs);
      }
      const { _productId, _variantMemberships, ...excelRow } = row;
      void _productId;
      void _variantMemberships;
      const addedRow = ws.addRow(excelRow);

      // ── Primary Image column: IMAGE() formula for excel-thumbnails mode ──
      // Extract the first URL from imageLinks (primary image is first line).
      // Uses Excel 365's IMAGE() function to display the image live in the cell.
      // Row height set to 60 (≈80px) for catalog display.
      if (isThumbnailsMode && !skipPrimaryImageColumn) {
        const primaryImageCell = addedRow.getCell('_primaryImage');
        const imageLinksValue = excelRow.imageLinks || '';
        // First line = primary image URL
        const firstUrl = imageLinksValue.split('\n')[0]?.trim() || '';
        if (firstUrl) {
          const formula = `IMAGE("${firstUrl}")`;
          primaryImageCell.value = { formula, result: null } as any;
          // Row height ~60 ≈ 80px — fits a 80×80 image comfortably.
          addedRow.height = 60;
          thumbnailsAdded++;
          if (thumbnailsAdded <= 3) {
            console.log(`[Export ${job.id}] Primary Image #${thumbnailsAdded}: formula=${formula.substring(0, 80)}...`);
          }
        } else {
          // No primary image — leave cell blank. No invalid formula.
          primaryImageCell.value = '';
        }
      }

      totalRowsWritten++;
    }
  }

  // ── Dynamic empty-column removal ──
  // Scan every non-required column. If every data row has null/""/undefined
  // in that column, hide it from the workbook.
  // Required product columns (the core identity + classification fields) are
  // NEVER removed. Non-required columns like imageLinks, variants, and some
  // optional fields CAN be removed if entirely empty.
  const REQUIRED_FIELD_KEYS = new Set([
    'sourceRow', 'productId', 'sku', 'ndNumber', 'barcode', 'brand',
    'department', 'category', 'nameAr', 'nameEn',
  ]);
  const columnsToHide: string[] = [];
  const lastRowNum = ws.rowCount;
  for (const col of ws.columns) {
    const colKey = (col as any).key as string | undefined;
    if (!colKey) continue;
    if (colKey === '_primaryImage') continue; // Primary Image column has formulas
    if (REQUIRED_FIELD_KEYS.has(colKey)) continue;

    let allEmpty = true;
    for (let rowNum = 2; rowNum <= lastRowNum; rowNum++) {
      const cell = ws.getCell(rowNum, col.number);
      const val = cell.value;
      if (val && typeof val === 'object' && 'formula' in val) {
        allEmpty = false;
        break;
      }
      if (val !== null && val !== undefined && val !== '') {
        allEmpty = false;
        break;
      }
    }
    if (allEmpty) {
      columnsToHide.push(colKey);
    }
  }
  if (columnsToHide.length > 0) {
    console.log(`[Export ${job.id}] Hiding ${columnsToHide.length} empty columns: ${columnsToHide.join(', ')}`);
    for (const key of columnsToHide) {
      ws.getColumn(key).hidden = true;
    }
  }

  const excelBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const excelMs = Date.now() - tExcelStart;
  const memAfterExcel = getMemoryUsageMb();

  console.log(`[Export ${job.id}] Excel workbook built: ${totalRowsWritten} rows, ${thumbnailsAdded} thumbnails, ${(excelBuffer.length / 1024).toFixed(1)} KB, ${excelMs}ms (mode=${job.exportMode})`);

  await logger.info('stage-building-zip', 'Excel workbook built', {
    rowsWritten: totalRowsWritten,
    thumbnailsAdded,
    exportMode: job.exportMode,
    excelBufferMb: (excelBuffer.length / 1024 / 1024).toFixed(2),
    excelMs,
    memoryAfterExcelMb: memAfterExcel.heap,
  });

  await db.exportJob.update({
    where: { id: job.id },
    data: { percentage: Math.round(stagePct('buildingZip', 2, 4)) },
  });

  // ── For excel-embedded AND excel-thumbnails modes: upload just the Excel file ──
  // No ZIP, no image download — the Excel file is lightweight.
  // For excel-thumbnails mode, the IMAGE() formulas reference Google Drive
  // thumbnail URLs directly (no images embedded in the workbook).
  if (job.exportMode !== 'excel-package') {
    const tUploadStart = Date.now();
    const { url, size } = await uploadExportFile(
      job.id,
      excelBuffer,
      'products_export.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const uploadMs = Date.now() - tUploadStart;
    const memAfterUpload = getMemoryUsageMb();

    await db.exportJob.update({
      where: { id: job.id },
      data: {
        stage: STAGE_LABELS.savingPackage,
        percentage: Math.round(stagePct('buildingZip', 4, 4)),
        blobUrl: url,
        fileSize: size,
        blobExpiresAt: computeBlobExpiresAt(),
      },
    });

    await logger.info('stage-building-zip', `Excel uploaded to Blob (${job.exportMode} mode)`, {
      exportMode: job.exportMode,
      blobUrl: url,
      fileSize: size,
      uploadMs,
      thumbnailsAdded,
      memoryAfterUploadMb: memAfterUpload.heap,
      totalStageMs: Date.now() - tStageStart,
    });
    return;
  }

  // ── Build ZIP: ZipArchive → Vercel Blob ──
  const archiverInstance = new ZipArchive({ zlib: { level: 5 } });

  // Append the Excel file.
  archiverInstance.append(excelBuffer, { name: 'Products.xlsx' });

  // Build a flat list of all images to fetch, in chunk order.
  type FetchTask = {
    folder: string;
    filename: string;
    url: string;
    chunkNumber: number;
  };
  const fetchTasks: FetchTask[] = [];
  for (const chunk of parsedChunks) {
    for (const img of chunk.images) {
      fetchTasks.push({
        folder: img.folder,
        filename: img.filename,
        url: img.url,
        chunkNumber: chunk.chunkNumber,
      });
    }
  }

  await logger.info('stage-building-zip', 'Starting image fetch + ZIP assembly', {
    totalImages: fetchTasks.length,
  });

  // Free parsed chunks (no longer needed — manifest is in fetchTasks).
  parsedChunks.length = 0;
  if (global.gc) { try { global.gc(); } catch {} }

  await db.exportJob.update({
    where: { id: job.id },
    data: { percentage: Math.round(stagePct('buildingZip', 3, 4)) },
  });

  // Archiver is itself a Readable stream that produces ZIP data.
  // Vercel Blob's put() accepts a ReadableStream, so we can pass the
  // archiver directly — no intermediate stream needed.
  //
  // We start the Blob upload FIRST (it consumes the archiver's output),
  // then append entries to the archiver. When archiver.finalize() is
  // called, the stream ends and the Blob upload completes.
  const blobPromise = uploadExportFile(
    job.id,
    archiverInstance as unknown as ReadableStream,
    'product_export_package.zip',
    'application/zip',
  );

  // Fetch images concurrently and append to archiver.
  const tDriveStart = Date.now();
  let imagesAdded = 0;
  let imagesFailed = 0;
  const CONCURRENCY = IMAGE_DOWNLOAD_CONCURRENCY;
  let nextTaskIndex = 0;

  async function fetchWorker() {
    while (true) {
      const idx = nextTaskIndex++;
      if (idx >= fetchTasks.length) break;
      const task = fetchTasks[idx];
      try {
        const res = await fetch(task.url, { redirect: 'follow' });
        if (!res.ok) {
          imagesFailed++;
          return;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0) {
          imagesFailed++;
          return;
        }
        archiverInstance.append(buf, { name: `Images/${task.folder}/${task.filename}` });
        imagesAdded++;
      } catch {
        imagesFailed++;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, fetchTasks.length) },
    () => fetchWorker(),
  );
  await Promise.all(workers);

  const driveMs = Date.now() - tDriveStart;

  await logger.info('stage-building-zip', 'All images fetched', {
    imagesAdded,
    imagesFailed,
    driveMs,
    speedImgPerSec: ((imagesAdded / (driveMs / 1000)) || 0).toFixed(1),
  });

  // Finalize the archiver — this writes the central directory and
  // ends the archiveStream, which completes the Blob upload.
  const tFinalizeStart = Date.now();
  archiverInstance.finalize();
  const { url, size } = await blobPromise;
  const finalizeMs = Date.now() - tFinalizeStart;

  const memAfter = getMemoryUsageMb();
  const totalStageMs = Date.now() - tStageStart;

  await db.exportJob.update({
    where: { id: job.id },
    data: {
      stage: STAGE_LABELS.savingPackage,
      percentage: Math.round(stagePct('buildingZip', 4, 4)),
      blobUrl: url,
      fileSize: size,
      blobExpiresAt: computeBlobExpiresAt(),
    },
  });

  await logger.info('stage-building-zip', 'ZIP uploaded to Blob', {
    blobUrl: url,
    fileSize: size,
    fileSizeMb: (size / 1024 / 1024).toFixed(2),
    finalizeMs,
    totalStageMs,
    totalElapsedMs: totalStageMs,
    memoryAfterMb: memAfter.heap,
    memoryRssAfterMb: memAfter.rss,
    memoryPeakDeltaMb: memAfter.heap - memBefore.heap,
  });

  // Best-effort: delete product chunks (no longer needed — ZIP is in Blob).
  // We deleted the `kind` column in the new schema — all chunks are 'products'
  // type now (zip_part rows are no longer used since ZIP lives in Blob).
  try {
    await db.exportChunk.deleteMany({
      where: { jobId: job.id },
    });
  } catch {}
}

async function transitionToSavingPackage(
  job: any,
  logger: ReturnType<typeof createExportLogger>,
) {
  // The blob is already uploaded by transitionToBuildingZip.
  // Just mark the job as completed.
  await db.exportJob.update({
    where: { id: job.id },
    data: {
      status: 'completed',
      stage: STAGE_LABELS.completed,
      percentage: 100,
      downloadUrl: `/api/export/${job.id}/download`,
      completedAt: new Date(),
    },
  });
  await logger.info('stage-completed', 'Export completed — ZIP ready in Blob', {
    blobUrl: job.blobUrl,
    fileSize: job.fileSize,
  });
}

async function handleStageCompleted(
  job: any,
  logger: ReturnType<typeof createExportLogger>,
) {
  // If we reach this stage directly (e.g., after a resume), just ensure
  // the job is marked completed. The blob should already exist.
  await db.exportJob.update({
    where: { id: job.id },
    data: {
      status: 'completed',
      stage: STAGE_LABELS.completed,
      percentage: 100,
      downloadUrl: `/api/export/${job.id}/download`,
      completedAt: new Date(),
    },
  });
  await logger.info('stage-completed', 'Export completed (idempotent)');
}
