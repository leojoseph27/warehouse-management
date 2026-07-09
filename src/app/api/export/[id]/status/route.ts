import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/export/[id]/status
 *
 * Returns the current status of an export job.
 * The frontend polls this endpoint every 1-2 seconds for live progress.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await db.exportJob.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        stage: true,
        percentage: true,
        exportMode: true,
        quality: true,
        totalProducts: true,
        processedProducts: true,
        totalImages: true,
        downloadedImages: true,
        resultSize: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error: any) {
    console.error('[export/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get export status', details: error?.message },
      { status: 500 }
    );
  }
}
