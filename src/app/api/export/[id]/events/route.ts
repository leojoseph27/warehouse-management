import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { formatEta, formatSpeed } from '@/lib/export-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/export/[id]/events
 *
 * Server-Sent Events (SSE) endpoint that streams export job progress.
 *
 * NOTE: The new chunked pipeline no longer uses SSE — the frontend
 * orchestrator drives progress directly via /api/export/process responses.
 * This endpoint is retained for backward compatibility (e.g., if an old
 * client tab is still open during a transition) and for any future
 * consumers that want push-style updates.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPercentage = -1;
      let lastStage = '';
      let lastProcessedProducts = -1;
      let lastDownloadedImages = -1;
      let closed = false;

      function sendEvent(data: any) {
        if (closed) return;
        const event = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(event));
      }

      controller.enqueue(encoder.encode(': connected\n\n'));

      const interval = setInterval(async () => {
        if (closed) return;

        try {
          const job = await db.exportJob.findUnique({
            where: { id },
            select: {
              id: true,
              status: true,
              stage: true,
              percentage: true,
              cursor: true,
              chunkCount: true,
              totalProducts: true,
              processedProducts: true,
              totalImages: true,
              downloadedImages: true,
              failedImages: true,
              estimatedSizeBytes: true,
              fileSize: true,
              blobExpiresAt: true,
              errorMessage: true,
              startedAt: true,
              completedAt: true,
            },
          });

          if (!job) {
            sendEvent({ error: 'Job not found', status: 'not_found' });
            closed = true;
            clearInterval(interval);
            controller.close();
            return;
          }

          const changed =
            job.percentage !== lastPercentage ||
            job.stage !== lastStage ||
            job.processedProducts !== lastProcessedProducts ||
            job.downloadedImages !== lastDownloadedImages ||
            job.status === 'completed' ||
            job.status === 'failed';

          if (changed) {
            lastPercentage = job.percentage;
            lastStage = job.stage;
            lastProcessedProducts = job.processedProducts;
            lastDownloadedImages = job.downloadedImages;

            const eta = formatEta(job.percentage, job.startedAt);
            const stageLower = (job.stage || '').toLowerCase();
            const speed =
              stageLower.includes('download') || stageLower.includes('image')
                ? formatSpeed(job.downloadedImages, job.startedAt, 'img')
                : stageLower.includes('product') || stageLower.includes('load')
                ? formatSpeed(job.processedProducts, job.startedAt, 'prod')
                : '';

            sendEvent({
              status: job.status,
              stage: job.stage,
              percentage: job.percentage,
              eta,
              speed,
              totalProducts: job.totalProducts,
              processedProducts: job.processedProducts,
              totalImages: job.totalImages,
              downloadedImages: job.downloadedImages,
              failedImages: job.failedImages,
              chunkCount: job.chunkCount,
              nextCursor: job.cursor,
              estimatedSizeBytes: job.estimatedSizeBytes,
              fileSize: job.fileSize,
              blobExpiresAt: job.blobExpiresAt,
              error: job.errorMessage,
              done: job.status === 'completed',
              downloadUrl: job.status === 'completed'
                ? `/api/export/${job.id}/download`
                : null,
            });

            if (['completed', 'failed', 'cancelled'].includes(job.status)) {
              closed = true;
              clearInterval(interval);
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          }
        } catch (err) {
          console.warn(`[export/events ${id}] Polling error:`, err);
        }
      }, 1000);

      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
