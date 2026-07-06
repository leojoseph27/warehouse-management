import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { COLUMN_DEFS, COLUMN_GROUPS } from '@/lib/lookups';
import * as XLSX from 'xlsx';

/**
 * Excel Export Route — Al-Nassim Master Catalog 52-Column Schema
 *
 * Export format:
 *   Row 1: Group headers (merged cells spanning their column ranges)
 *     - Product Identity (cols 0–9, 10 cols)
 *     - Classification (cols 10–15, 6 cols)
 *     - Product Information (cols 16–21, 6 cols)
 *     - Attributes (cols 22–34, 13 cols)
 *     - Logistics (cols 35–37, 3 cols)
 *     - Commercial (col 38, 1 col)
 *     - SEO (cols 39–43, 5 cols)
 *     - Internal (cols 44–51, 8 cols)
 *   Row 2: Actual column headers from COLUMN_DEFS
 *   Row 3+: Data rows
 */

// Column widths for each of the 52 columns (approximate)
const COL_WIDTHS = [
  // Product Identity (10)
  10, 14, 14, 14, 16, 12, 18, 16, 10, 14,
  // Classification (6)
  22, 20, 20, 12, 18, 18,
  // Product Information (6)
  30, 30, 28, 28, 30, 30,
  // Attributes (13)
  12, 14, 16, 16, 10, 12, 10, 10, 8, 8, 8, 10, 12,
  // Logistics (3)
  18, 8, 16,
  // Commercial (1)
  14,
  // SEO (5)
  30, 30, 35, 35, 30,
  // Internal (8)
  24, 16, 14, 8, 10, 14, 14, 22,
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceRowFrom = searchParams.get('sourceRowFrom');
    const sourceRowTo = searchParams.get('sourceRowTo');

    const where: any = {};
    if (sourceRowFrom !== null && sourceRowTo !== null) {
      const from = Number(sourceRowFrom);
      const to = Number(sourceRowTo);
      if (isNaN(from) || isNaN(to)) {
        return NextResponse.json({ error: 'Invalid range format.' }, { status: 400 });
      }
      if (from > to) {
        return NextResponse.json({ error: 'Invalid range: start > end.' }, { status: 400 });
      }
      where.sourceRow = { gte: from, lte: to };
    }

    const data = await db.product.findMany({
      where,
      include: { images: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { sourceRow: 'asc' },
    });

    const workbook = XLSX.utils.book_new();
    const worksheet: XLSX.WorkSheet = {};
    const totalCols = COLUMN_DEFS.length; // 52
    const totalRows = data.length;
    const maxRow = totalRows + 2; // +2 for two header rows

    // ── Row 1: Group headers (merged cells) ──
    const merges: XLSX.Range[] = [];
    let colOffset = 0;
    for (const group of COLUMN_GROUPS) {
      const span = group.fields.length;
      // Write group name in first column of the span
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colOffset });
      worksheet[cellRef] = { t: 's', v: group.name };

      if (span > 1) {
        merges.push({
          s: { r: 0, c: colOffset },
          e: { r: 0, c: colOffset + span - 1 },
        });
      }
      colOffset += span;
    }

    // ── Row 2: Actual column headers from COLUMN_DEFS ──
    for (let c = 0; c < totalCols; c++) {
      const colDef = COLUMN_DEFS[c];
      const cellRef = XLSX.utils.encode_cell({ r: 1, c });
      worksheet[cellRef] = { t: 's', v: colDef.header };
    }

    // ── Row 3+: Data rows ──
    for (let r = 0; r < totalRows; r++) {
      const product = data[r] as any;
      for (let c = 0; c < totalCols; c++) {
        const colDef = COLUMN_DEFS[c];
        const cellRef = XLSX.utils.encode_cell({ r: r + 2, c });

        const value = product[colDef.field] ?? '';

        if (value === '' || value === null || value === undefined) {
          worksheet[cellRef] = { t: 's', v: '' };
        } else if (typeof value === 'number') {
          worksheet[cellRef] = { t: 'n', v: value };
        } else {
          worksheet[cellRef] = { t: 's', v: String(value) };
        }
      }
    }

    // Set sheet range
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(maxRow - 1, 1), c: totalCols - 1 },
    });

    // Apply merges for group headers
    worksheet['!merges'] = merges;

    // Set column widths
    worksheet['!cols'] = COL_WIDTHS.map(w => ({ wch: w }));

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Catalog');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="alnassim_catalog_export.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error exporting Excel:', error);
    return NextResponse.json({ error: 'Failed to export Excel file' }, { status: 500 });
  }
}
