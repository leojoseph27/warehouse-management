import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Import Jobs API
 *
 * GET /api/import-jobs - List all import jobs
 * GET /api/import-jobs?id=xxx - Get specific job status
 * POST /api/import-jobs - Create new import job (async mode)
 * DELETE /api/import-jobs?id=xxx - Cancel a pending job
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (jobId) {
      // Get specific job status
      const job = await db.importJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: job.id,
        status: job.status,
        fileName: job.fileName,
        fileSize: job.fileSize,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        importedRows: job.importedRows,
        errorRows: job.errorRows,
        skippedRows: job.skippedRows,
        progress: job.progress,
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        errorMessage: job.errorMessage,
        errorDetails: job.errorDetails ? JSON.parse(job.errorDetails) : null,
        resultData: job.resultData ? JSON.parse(job.resultData) : null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      });
    }

    // List all jobs
    const jobs = await db.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      jobs: jobs.map(j => ({
        id: j.id,
        status: j.status,
        fileName: j.fileName,
        fileSize: j.fileSize,
        totalRows: j.totalRows,
        progress: j.progress,
        importedRows: j.importedRows,
        errorRows: j.errorRows,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt?.toISOString(),
      })),
      total: jobs.length,
    });
  } catch (error) {
    console.error('Error fetching import jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch import jobs' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const job = await db.importJob.findUnique({ where: { id: jobId } });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'completed') {
      return NextResponse.json({ error: 'Cannot cancel completed job' }, { status: 400 });
    }

    // Mark as cancelled
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error('Error cancelling import job:', error);
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
  }
}