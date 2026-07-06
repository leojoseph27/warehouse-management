import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

/**
 * Excel Export Route — Two-Row Header with Merged "SIZE mm" Group
 * Rewritten to use Prisma with Neon PostgreSQL.
 */

interface ColDef {
  header1: string;
  header2: string;
  dbField: string;
  isJsonArray?: boolean;
  isVirtual?: boolean;
}

const COLUMN_DEFS: ColDef[] = [
  { header1: 'sr', header2: '', dbField: 'sr' },
  { header1: 'English Description', header2: '', dbField: 'englishDescription' },
  { header1: 'Arabic Description', header2: '', dbField: 'arabicDescription' },
  { header1: 'ND Number', header2: '', dbField: 'ndNumber' },
  { header1: 'barcode', header2: '', dbField: 'barcode' },
  { header1: 'Colour', header2: '', dbField: 'colours', isJsonArray: true },
  { header1: 'SIZE mm', header2: 'L', dbField: 'length' },
  { header1: '',        header2: 'W', dbField: 'width' },
  { header1: '',        header2: 'H', dbField: 'height' },
  { header1: 'Made', header2: '', dbField: 'made' },
  { header1: 'Material', header2: '', dbField: 'materials', isJsonArray: true },
  { header1: 'Additional INFO', header2: '', dbField: 'additionalInfo', isJsonArray: true },
  { header1: 'PRICE', header2: '', dbField: 'price' },
  { header1: 'Pcs', header2: '', dbField: 'pcs' },
  { header1: 'Images', header2: '', dbField: 'product_images_urls', isVirtual: true },
];

function jsonArrayToString(value: any): string {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return arr.join(', ');
      return String(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getVirtualFieldValue(product: any, dbField: string): string {
  if (dbField === 'product_images_urls') {
    if (product.images && Array.isArray(product.images)) {
      const urls = product.images.filter((img: any) => img.imageUrl).map((img: any) => img.imageUrl);
      return urls.length > 0 ? urls.join(', ') : '';
    }
    return '';
  }
  return '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const srFromParam = searchParams.get('srFrom');
    const srToParam = searchParams.get('srTo');

    const where: any = {};
    if (srFromParam !== null && srToParam !== null) {
      const srFrom = Number(srFromParam);
      const srTo = Number(srToParam);
      if (isNaN(srFrom) || isNaN(srTo)) {
        return NextResponse.json({ error: 'Invalid range format.' }, { status: 400 });
      }
      if (srFrom > srTo) {
        return NextResponse.json({ error: 'Invalid range: start > end.' }, { status: 400 });
      }
      where.sr = { gte: srFrom, lte: srTo };
    }

    const data = await db.product.findMany({
      where,
      include: { images: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { sr: 'asc' },
    });

    const workbook = XLSX.utils.book_new();
    const worksheet: XLSX.WorkSheet = {};
    const totalCols = COLUMN_DEFS.length;
    const totalRows = data.length;
    const maxRow = totalRows + 2;

    for (let c = 0; c < totalCols; c++) {
      const col = COLUMN_DEFS[c];
      if (col.header1) worksheet[XLSX.utils.encode_cell({ r: 0, c })] = { t: 's', v: col.header1 };
      if (col.header2) worksheet[XLSX.utils.encode_cell({ r: 1, c })] = { t: 's', v: col.header2 };
    }

    for (let r = 0; r < totalRows; r++) {
      const product = data[r];
      for (let c = 0; c < totalCols; c++) {
        const col = COLUMN_DEFS[c];
        const cellRef = XLSX.utils.encode_cell({ r: r + 2, c });

        let value: any;
        if (col.isVirtual) {
          value = getVirtualFieldValue(product, col.dbField);
        } else {
          value = (product as any)[col.dbField] ?? '';
        }

        if (col.isJsonArray) value = jsonArrayToString(value);

        if (value === '' || value === null || value === undefined) {
          worksheet[cellRef] = { t: 's', v: '' };
        } else if (typeof value === 'number') {
          worksheet[cellRef] = { t: 'n', v: value };
        } else {
          worksheet[cellRef] = { t: 's', v: String(value) };
        }
      }
    }

    worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(maxRow - 1, 1), c: totalCols - 1 } });

    const sizeStartCol = COLUMN_DEFS.findIndex(c => c.header1 === 'SIZE mm');
    if (sizeStartCol !== -1) {
      worksheet['!merges'] = [{ s: { r: 0, c: sizeStartCol }, e: { r: 0, c: sizeStartCol + 2 } }];
    }

    worksheet['!cols'] = [
      { wch: 6 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 18 },
      { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 6 }, { wch: 50 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="products_export.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return NextResponse.json({ error: 'Failed to export Excel file' }, { status: 500 });
  }
}
