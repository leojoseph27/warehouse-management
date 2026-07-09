import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/export/[id]/events
 *
 * Server-Sent Events (SSE) endpoint that streams export job progress.
 * The server polls the database every 1s and pushes updates to the client
 * whenever the progress changes. When the job completes, fails, or is
 * cancelled, a final event is sent and the stream closes.
 *
 * The frontend uses EventSource to connect. If the connection drops,
 * EventSource automatically reconnects (built-in browser behavior).
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
      let closed = false;

      function sendEvent(data: any) {
        if (closed) return;
        const event = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(event));
      }

      // Send an initial comment to establish the connection
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Poll the database every 1 second for progress changes
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
              totalProducts: true,
              processedProducts: true,
              totalImages: true,
              downloadedImages: true,
              errorMessage: true,
              resultSize: true,
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

          // Only send if something changed
          const changed =
            job.percentage !== lastPercentage ||
            job.stage !== lastStage ||
            job.status === 'completed' ||
            job.status === 'failed';

          if (changed) {
            lastPercentage = job.percentage;
            lastStage = job.stage;

            // Calculate ETA
            let eta = 'Calculating...';
            if (job.percentage >= 5 && job.percentage < 100 && job.startedAt) {
              const elapsed = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
              if (elapsed > 2) {
                const totalEst = elapsed / (job.percentage / 100);
                const remaining = Math.max(0, totalEst - elapsed);
                const mins = Math.floor(remaining / 60);
                const secs = Math.floor(remaining % 60);
                eta = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
              }
            } else if (job.percentage >= 100) {
              eta = '00:00';
            }

            // Calculate speed (images/sec or products/sec)
            let speed = '';
            if (job.startedAt && job.percentage > 0 && job.percentage < 100) {
              const elapsed = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
              if (job.downloadedImages > 0 && elapsed > 0) {
                speed = `${(job.downloadedImages / elapsed).toFixed(1)} img/s`;
              } else if (job.processedProducts > 0 && elapsed > 0) {
                speed = `${(job.processedProducts / elapsed).toFixed(1)} prod/s`;
              }
            }

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
              error: job.errorMessage,
              done: job.status === 'completed',
              resultSize: job.resultSize,
            });

            // If the job is in a terminal state, close the stream
            if (job.status === 'completed' || job.status === 'failed') {
              closed = true;
              clearInterval(interval);
              // Send a final [DONE] marker
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          }
        } catch (err) {
          // DB error — keep trying, don't crash the stream
          console.warn(`[export/events ${id}] Polling error:`, err);
        }
      }, 1000);

      // Clean up on abort (client disconnect)
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
