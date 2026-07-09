import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/export/[id]/download
 *
 * Returns the generated ZIP file for a completed export job.
 * The ZIP is stored as base64 in the database (resultBlob field).
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
        resultBlob: true,
        resultSize: true,
        exportMode: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    if (job.status !== 'completed') {
      return NextResponse.json({
        error: 'Export is not completed yet',
        status: job.status,
      }, { status: 400 });
    }

    if (!job.resultBlob) {
      return NextResponse.json({ error: 'No result data available' }, { status: 404 });
    }

    // Decode base64 to binary
    const zipBuffer = Buffer.from(job.resultBlob, 'base64');

    const contentType = job.exportMode === 'excel-package'
      ? 'application/zip'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const filename = job.exportMode === 'excel-package'
      ? 'product_export_package.zip'
      : 'products_export.xlsx';

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('[export/download] Error:', error);
    return NextResponse.json(
      { error: 'Failed to download export', details: error?.message },
      { status: 500 }
    );
  }
}
