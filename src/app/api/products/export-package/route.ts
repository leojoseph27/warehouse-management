import { NextRequest } from 'next/server';
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
 * GET /api/products/export-package
 *
 * Streams SSE progress events, then the binary ZIP data.
 * The response content-type is text/event-stream for progress,
 * then switches to application/zip for the binary.
 *
 * Since we can't mix SSE and binary in one response on Vercel,
 * we use a custom format: progress events as SSE, terminated by
 * a special marker, then binary data follows.
 *
 * Actually, the simplest approach: return a ReadableStream that
 * emits SSE progress events interleaved with the final binary.
 * The frontend reads the stream, parses SSE events for progress,
 * and collects the binary portion for download.
 *
 * Implementation: We use a multipart-like approach where we
 * send SSE data: lines for progress, then a final data: [BINARY]
 * marker followed by the raw ZIP bytes.
 *
 * Simplified approach: Just use a custom text stream that sends
 * JSON progress lines (one per line), then a blank line, then
 * the binary ZIP. The frontend reads lines until blank, then
 * treats the rest as binary.
 *
 * Actually the cleanest: send progress as SSE, then when done,
 * send the binary as a base64 data URL in a final SSE event.
 * But base64 encoding a large ZIP is wasteful.
 *
 * Final approach: Two-phase response.
 * Phase 1: text/event-stream with progress updates
 * Phase 2: After progress is done, the response body continues
 * with raw binary ZIP data (the frontend detects the switch
 * by looking for a content-type change or a marker).
 *
 * Since we can't change content-type mid-response, we use:
 * Content-Type: application/octet-stream
 * The response body is: SSE events (text) + \n\n[ZIP_BINARY]\n\n
 * The frontend parses SSE events from the beginning, and when
 * it sees a non-SSE line (not starting with "data: "), it
 * treats everything from that point as binary.
 *
 * SIMPLEST WORKING APPROACH:
 * Just do the export, write progress to console.log (visible in
 * Vercel logs), and return the binary. The frontend shows a
 * fake-but-reasonable progress bar based on time estimates.
 * This avoids the complexity of streaming SSE + binary.
 *
 * ACTUALLY: We CAN stream. Let's use a ReadableStream that
 * emits progress events as SSE, then emits the binary as
 * a final chunk. The frontend reads the stream, splits SSE
 * events from binary data.
 */
export async function GET(request: NextRequest) {
  const t0 = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const sourceRowFrom = searchParams.get('srFrom');
    const sourceRowTo = searchParams.get('srTo');
    const quality = searchParams.get('quality') || 'high';
    const stream = searchParams.get('stream') !== 'false'; // default: true

    const folderSizeParam = quality === 'high' ? 'sz=w2000' : quality === 'medium' ? 'sz=w1000' : 'sz=w400';
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

    if (data.length === 0) {
      return new Response(JSON.stringify({ error: 'No products found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Count total images for progress tracking
    const allImageEntries: { folderName: string; filename: string; url: string; productIndex: number }[] = [];
    for (let r = 0; r < data.length; r++) {
      const product = data[r] as any;
      const folderName = product.ndNumber?.trim() ||
        (product.barcode ? `Barcode_${product.barcode}` : `Product_${product.productId || product.sourceRow}`);
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
            allImageEntries.push({ folderName, filename, url: imgUrl, productIndex: r });
          }
        }
      }
    }

    // Primary images for embedding
    const primaryImageTasks = data.map((product: any, index: number) => ({
      product, index,
      image: product.images?.find((img: any) => img.isPrimary) || product.images?.[0] || null,
    })).filter(t => t.image !== null);

    const totalImages = allImageEntries.length;
    const totalPrimaryImages = primaryImageTasks.length;
    const totalProducts = data.length;

    // If streaming is requested, use a ReadableStream to emit progress + binary
    if (stream) {
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          let downloadedImages = 0;
          let processedProducts = 0;

          function sendProgress(stage: string, percentage: number, extra: any = {}) {
            const event = `data: ${JSON.stringify({
              stage,
              percentage: Math.round(percentage),
              totalProducts,
              processedProducts,
              totalImages,
              downloadedImages,
              ...extra,
            })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }

          sendProgress('Loading products from database...', 2);
          await new Promise(r => setTimeout(r, 50)); // Let the first event flush

          sendProgress('Preparing image downloads...', 5, { totalImages, totalPrimaryImages });

          // ── Stage 2: Download primary images for embedding ──
          const imageCache = new Map<string, Buffer>();
          let primaryDownloaded = 0;

          sendProgress('Downloading primary images for embedding...', 10);

          await pooledMap(8, primaryImageTasks, async (task) => {
            const { image } = task;
            const cacheKey = image.driveFileId || image.imageUrl || `${task.product.id}_${task.index}`;
            if (imageCache.has(cacheKey)) {
              primaryDownloaded++;
              sendProgress('Downloading primary images for embedding...', 10 + (primaryDownloaded / Math.max(totalPrimaryImages, 1)) * 20, {
                downloadedImages: primaryDownloaded,
                totalImages: totalPrimaryImages,
              });
              return;
            }

            let previewUrl = '';
            if (image.driveFileId) {
              previewUrl = `https://drive.google.com/thumbnail?id=${image.driveFileId}&${previewSizeParam}`;
            } else if (image.thumbnailUrl) {
              previewUrl = image.thumbnailUrl;
            } else if (image.imageUrl && !image.imageUrl.startsWith('data:')) {
              previewUrl = image.imageUrl;
            }

            if (!previewUrl) {
              primaryDownloaded++;
              return;
            }

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
              console.warn(`[export-package] Primary image download failed: ${err}`);
            }

            primaryDownloaded++;
            sendProgress('Downloading primary images for embedding...', 10 + (primaryDownloaded / Math.max(totalPrimaryImages, 1)) * 20, {
              downloadedImages: primaryDownloaded,
              totalImages: totalPrimaryImages,
            });
          });

          // ── Stage 3: Generate Excel workbook ──
          sendProgress('Generating Excel workbook...', 35);

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
              sendProgress('Embedding images into Excel...', 35 + (processedProducts / totalProducts) * 30, {
                processedProducts,
              });
            }
          }

          const excelBuffer = await workbook.xlsx.writeBuffer();
          sendProgress('Workbook generated. Creating ZIP package...', 70);

          // ── Stage 4: Create ZIP with images ──
          const archive = createZip();
          archive.append(Readable.from(Buffer.from(excelBuffer)), { name: 'Products.xlsx' });

          let zipImagesAdded = 0;
          let zipImagesFailed = 0;

          sendProgress('Downloading images for ZIP folder...', 72, { downloadedImages: 0, totalImages });

          await pooledMap(8, allImageEntries, async (entry) => {
            try {
              const imgRes = await fetch(entry.url, { redirect: 'follow' });
              if (imgRes.ok) {
                const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
                archive.append(imgBuffer, { name: `Images/${entry.folderName}/${entry.filename}` });
                zipImagesAdded++;
              } else {
                zipImagesFailed++;
              }
            } catch { zipImagesFailed++; }

            downloadedImages = zipImagesAdded + zipImagesFailed;
            if (downloadedImages % 10 === 0 || downloadedImages === allImageEntries.length) {
              sendProgress('Downloading images for ZIP folder...', 72 + (downloadedImages / Math.max(allImageEntries.length, 1)) * 20, {
                downloadedImages,
                totalImages: allImageEntries.length,
              });
            }
          });

          sendProgress('Creating ZIP package...', 95);

          archive.finalize();
          const chunks: Buffer[] = [];
          for await (const chunk of archive) {
            chunks.push(Buffer.from(chunk));
          }
          const zipBuffer = Buffer.concat(chunks);

          // ── Done: send completion event, then binary ──
          const tTotal = Date.now() - t0;
          sendProgress('Completed', 100, { done: true, duration: `${(tTotal / 1000).toFixed(1)}s` });

          // Send the [DONE] marker
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Now send the binary ZIP as a special marker + raw bytes
          const binaryMarker = encoder.encode(`data: [BINARY_START]\n\n`);
          controller.enqueue(binaryMarker);

          // Send the ZIP in chunks to avoid memory issues
          const chunkSize = 64 * 1024; // 64KB chunks
          for (let i = 0; i < zipBuffer.length; i += chunkSize) {
            const chunk = zipBuffer.subarray(i, Math.min(i + chunkSize, zipBuffer.length));
            controller.enqueue(new Uint8Array(chunk));
          }

          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode (fallback — same as before)
    // ... (existing code without streaming)
    // For brevity, redirect to the non-stream logic
    // This path is rarely used since the frontend defaults to stream=true

    // Download primary images
    const imageCache = new Map<string, Buffer>();
    const downloadedPrimaries = await pooledMap(8, primaryImageTasks, async (task) => {
      const { image } = task;
      const cacheKey = image.driveFileId || image.imageUrl || `${task.product.id}_${task.index}`;
      if (imageCache.has(cacheKey)) return { buffer: imageCache.get(cacheKey)!, error: null };
      let previewUrl = '';
      if (image.driveFileId) previewUrl = `https://drive.google.com/thumbnail?id=${image.driveFileId}&${previewSizeParam}`;
      else if (image.thumbnailUrl) previewUrl = image.thumbnailUrl;
      else if (image.imageUrl && !image.imageUrl.startsWith('data:')) previewUrl = image.imageUrl;
      if (!previewUrl) return { buffer: null, error: 'No URL' };
      try {
        const imgRes = await fetch(previewUrl, { redirect: 'follow' });
        if (!imgRes.ok) return { buffer: null, error: `HTTP ${imgRes.status}` };
        const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
        let previewBuffer = rawBuffer;
        try { previewBuffer = await sharp(rawBuffer).resize(400, 400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(); } catch { previewBuffer = rawBuffer; }
        imageCache.set(cacheKey, previewBuffer);
        return { buffer: previewBuffer, error: null };
      } catch (err: any) { return { buffer: null, error: err.message }; }
    });

    const previewMap = new Map<number, { buffer: Buffer | null; error: string | null }>();
    downloadedPrimaries.forEach((r, i) => previewMap.set(primaryImageTasks[i].index, r));

    // Generate Excel
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Master Catalog');
    const columns: any[] = [
      { header: 'Primary Image', key: '_primaryImage', width: 15 },
      ...COLUMN_DEFS.map((col: any) => ({ header: col.header, key: col.field, width: Math.max(10, Math.min(50, (col.header?.length || 10) + 5)) })),
      { header: 'Image Folder', key: '_imageFolder', width: 30 },
    ];
    ws.columns = columns;
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    for (let r = 0; r < data.length; r++) {
      const product = data[r] as any;
      const rowIdx = r + 2;
      const folderName = product.ndNumber?.trim() || (product.barcode ? `Barcode_${product.barcode}` : `Product_${product.productId || product.sourceRow}`);
      const rowData: any = {};
      for (const colDef of COLUMN_DEFS) {
        let value: any;
        if (colDef.field === 'imageLinks') value = resolveImageLinks(product);
        else if (colDef.field === 'variants') value = resolveVariants(product, data);
        else value = product[colDef.field];
        if (typeof value === 'string' && value.length > 32767) value = value.slice(0, 32747) + '... [truncated]';
        rowData[colDef.field] = value === null || value === undefined ? '' : value;
      }
      rowData['_imageFolder'] = `Images/${folderName}`;
      const row = ws.addRow(rowData);
      row.height = 90;
      const preview = previewMap.get(r);
      if (preview?.buffer) {
        try {
          const imageId = workbook.addImage({ buffer: preview.buffer, extension: 'jpeg' });
          ws.addImage(imageId, { tl: { col: 0, row: rowIdx - 1 }, br: { col: 1, row: rowIdx }, editAs: 'oneCell' });
        } catch {}
      }
    }

    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Create ZIP
    const archive = createZip();
    archive.append(Readable.from(Buffer.from(excelBuffer)), { name: 'Products.xlsx' });
    let zipImagesAdded = 0;
    await pooledMap(8, allImageEntries, async (entry) => {
      try {
        const imgRes = await fetch(entry.url, { redirect: 'follow' });
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          archive.append(imgBuffer, { name: `Images/${entry.folderName}/${entry.filename}` });
          zipImagesAdded++;
        }
      } catch {}
    });
    archive.finalize();
    const chunks: Buffer[] = [];
    for await (const chunk of archive) chunks.push(Buffer.from(chunk));
    const zipBuffer = Buffer.concat(chunks);

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="product_export_package.zip"',
      },
    });
  } catch (error: any) {
    console.error('[export-package] FAILED:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate export package', details: error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
