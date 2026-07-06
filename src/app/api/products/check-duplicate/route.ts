import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ndNumber = searchParams.get('ndNumber') || '';
    const barcode = searchParams.get('barcode') || '';
    const excludeId = searchParams.get('excludeId') || '';

    const duplicates: { ndNumber?: any; barcode?: any } = {};

    if (ndNumber) {
      const where: any = { ndNumber };
      if (excludeId) where.id = { not: excludeId };

      const row = await db.product.findFirst({
        where,
        select: { id: true, sr: true, englishDescription: true, ndNumber: true },
      });

      if (row) {
        duplicates.ndNumber = {
          id: row.id,
          sr: row.sr,
          englishDescription: row.englishDescription,
          ndNumber: row.ndNumber,
        };
      }
    }

    if (barcode) {
      const where: any = { barcode };
      if (excludeId) where.id = { not: excludeId };

      const row = await db.product.findFirst({
        where,
        select: { id: true, sr: true, englishDescription: true, barcode: true },
      });

      if (row) {
        duplicates.barcode = {
          id: row.id,
          sr: row.sr,
          englishDescription: row.englishDescription,
          barcode: row.barcode,
        };
      }
    }

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 });
  }
}
