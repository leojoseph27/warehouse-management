import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

/**
 * Excel Import Route — Two-Row Header Support
 * Uses Prisma ORM with Neon PostgreSQL.
 */

const COLUMN_MAPPINGS: {
  patterns: string[];
  field: string;
  type: 'number' | 'string' | 'array' | 'price';
}[] = [
  { patterns: ['sr', 'Sr', 'SR', 's.r', 'S.R', 'serial', 'Serial', 'no', 'No', '#'], field: 'sr', type: 'number' },
  { patterns: ['english description', 'englishdescription', 'english_description', 'english desc', 'description', 'desc', 'english_desc', 'product description', 'name'], field: 'englishDescription', type: 'string' },
  { patterns: ['arabic description', 'arabicdescription', 'arabic_description', 'arabic desc', 'arabic_desc', 'arabic', 'arab description'], field: 'arabicDescription', type: 'string' },
  { patterns: ['nd number', 'ndnumber', 'nd_number', 'nd no', 'ndno', 'nd_no', 'nd', 'ND Number', 'ND'], field: 'ndNumber', type: 'string' },
  { patterns: ['barcode', 'Barcode', 'BARCODE', 'bar code', 'bar_code', 'ean', 'upc', 'code', 'Code'], field: 'barcode', type: 'string' },
  { patterns: ['colour', 'color', 'Colour', 'Color', 'COLOUR', 'COLOR', 'colours', 'colors'], field: 'colours', type: 'array' },
  { patterns: ['l', 'L', 'length', 'Length', 'LENGTH', 'len', 'Lng', 'long', 'dimension l'], field: 'length', type: 'number' },
  { patterns: ['w', 'W', 'width', 'Width', 'WIDTH', 'wid', 'dimension w'], field: 'width', type: 'number' },
  { patterns: ['h', 'H', 'height', 'Height', 'HEIGHT', 'ht', 'dimension h'], field: 'height', type: 'number' },
  { patterns: ['made', 'Made', 'MADE', 'made in', 'Made In', 'made_in', 'origin', 'country', 'country of origin'], field: 'made', type: 'string' },
  { patterns: ['material', 'Material', 'MATERIAL', 'materials', 'Materials', 'MATERIALS', 'mat'], field: 'materials', type: 'array' },
  { patterns: ['additional info', 'additionalinfo', 'additional_info', 'additional information', 'add info', 'add_info', 'additional', 'extra info', 'extra_info', 'info', 'notes', 'extra'], field: 'additionalInfo', type: 'array' },
  { patterns: ['price', 'Price', 'PRICE', 'unit price', 'unitprice', 'unit_price', 'cost', 'amount', 'rate'], field: 'price', type: 'price' },
  { patterns: ['pcs', 'Pcs', 'PCS', 'pieces', 'Pieces', 'PIECES', 'piece', 'qty', 'quantity', 'Quantity', 'QTY', 'units', 'stock'], field: 'pcs', type: 'number' },
  { patterns: ['photo', 'Photo', 'PHOTO', 'image', 'Image', 'picture', 'Picture', 'img'], field: 'photo', type: 'string' },
];

const PARENT_HEADERS_NORMALIZED = ['sizemm', 'size', 'dimensions', 'dimension', 'sizemm'];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]/g, '').trim();
}

function resolveTwoRowHeaders(worksheet: XLSX.WorkSheet): { headers: string[]; dataStartRow: number } {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const maxCol = range.e.c;
  const headers: string[] = [];
  const row1: string[] = [];
  const row2: string[] = [];

  for (let c = 0; c <= maxCol; c++) {
    const cell1 = worksheet[XLSX.utils.encode_cell({ r: 0, c })];
    const cell2 = worksheet[XLSX.utils.encode_cell({ r: 1, c })];
    row1.push(cell1 ? String(cell1.v ?? '').trim() : '');
    row2.push(cell2 ? String(cell2.v ?? '').trim() : '');
  }

  const row2HasContent = row2.some(v => v !== '');
  const row2LooksLikeSubHeaders = row2HasContent && row2.every(v => v === '' || v.length <= 20);
  const row1HasParentHeader = row1.some(v => PARENT_HEADERS_NORMALIZED.includes(normalize(v)));

  if (row2HasContent && (row2LooksLikeSubHeaders || row1HasParentHeader)) {
    for (let c = 0; c <= maxCol; c++) {
      const r1 = row1[c];
      const r2 = row2[c];
      const r1Norm = normalize(r1);

      if (PARENT_HEADERS_NORMALIZED.includes(r1Norm) && r2 !== '') {
        headers.push(r2);
      } else if (r1 === '' && r2 !== '') {
        headers.push(r2);
      } else if (r2 === '') {
        headers.push(r1);
      } else if (PARENT_HEADERS_NORMALIZED.includes(r1Norm)) {
        headers.push(r2);
      } else {
        headers.push(r1);
      }
    }
    return { headers, dataStartRow: 2 };
  }

  for (let c = 0; c <= maxCol; c++) {
    headers.push(row1[c]);
  }
  return { headers, dataStartRow: 1 };
}

function matchHeader(header: string, patterns: string[]): boolean {
  if (!header) return false;
  const headerLower = header.toLowerCase();
  const headerNorm = normalize(header);
  return patterns.some(p => header === p || headerLower === p.toLowerCase() || headerNorm === normalize(p));
}

function buildColumnMapping(headers: string[]): { mapping: Map<number, { field: string; type: string }>; unmapped: string[] } {
  const mapping = new Map<number, { field: string; type: string }>();
  const mappedIndices = new Set<number>();

  for (const colMapping of COLUMN_MAPPINGS) {
    for (let c = 0; c < headers.length; c++) {
      if (mappedIndices.has(c)) continue;
      if (matchHeader(headers[c], colMapping.patterns)) {
        mapping.set(c, { field: colMapping.field, type: colMapping.type });
        mappedIndices.add(c);
        break;
      }
    }
  }

  const unmapped = headers.map((h, i) => ({ h, i })).filter(({ h, i }) => h && !mappedIndices.has(i)).map(({ h }) => h);
  return { mapping, unmapped };
}

function parseArrayField(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) {
    const filtered = value.filter(v => String(v).trim());
    return filtered.length > 0 ? JSON.stringify(filtered) : null;
  }
  const str = String(value).trim();
  if (!str) return null;
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) return JSON.stringify(parsed);
      if (Array.isArray(parsed) && parsed.length === 0) return null;
    } catch {}
  }
  const items = str.split(/[,;|]/).map(v => v.trim()).filter(Boolean);
  return items.length > 0 ? JSON.stringify(items) : null;
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function toPrice(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value === 0 ? null : value;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '').trim();
  if (!cleaned || cleaned === '.') return null;
  const num = Number(cleaned);
  if (isNaN(num) || num === 0) return null;
  return num;
}

function toString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim() || null;
}

function toBarcode(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value.toLocaleString('fullwide', { useGrouping: false });
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d+\.?\d*e[+-]?\d+$/i.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) return num.toLocaleString('fullwide', { useGrouping: false });
  }
  return str;
}

function getCellValue(worksheet: XLSX.WorkSheet, r: number, c: number): any {
  const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : '';
}

export async function POST(request: NextRequest) {
  const importStartTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    if (!workbook.SheetNames.length) {
      return NextResponse.json({ error: 'Excel file has no sheets' }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet['!ref']) {
      return NextResponse.json({ error: 'Excel sheet is empty' }, { status: 400 });
    }

    const { headers, dataStartRow } = resolveTwoRowHeaders(worksheet);
    const { mapping, unmapped } = buildColumnMapping(headers);

    const mappedHeaders: Record<string, string> = {};
    for (const [colIdx, mapInfo] of mapping) {
      mappedHeaders[mapInfo.field] = headers[colIdx];
    }

    if (mapping.size === 0) {
      return NextResponse.json({
        error: 'No recognizable column headers found in Excel file.',
        rawHeaders: headers,
        imported: 0, errors: 0, total: 0, skipped: 0,
      }, { status: 400 });
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalDataRows = range.e.r - dataStartRow + 1;

    if (totalDataRows <= 0) {
      return NextResponse.json({
        error: 'Excel file has no data rows after headers',
        imported: 0, errors: 0, total: 0, skipped: 0,
      }, { status: 400 });
    }

    let imported = 0;
    let errors = 0;
    let skipped = 0;
    let withPrice = 0;
    let withoutPrice = 0;
    const errorDetails: { row: number; error: string }[] = [];
    const successDetails: { row: number; sr: number | null; description: string | null; ndNumber: string | null }[] = [];
    const previewRows: { row: number; data: Record<string, any> }[] = [];

    // Parse and insert in batches
    const BATCH_SIZE = 100;
    const batchRows: { rowNum: number; data: Record<string, any>; record: Record<string, any> }[] = [];

    for (let r = dataStartRow; r <= range.e.r; r++) {
      const rowNum = r + 1;
      const record: Record<string, any> = {};

      for (const [colIdx, mapInfo] of mapping) {
        const rawValue = getCellValue(worksheet, r, colIdx);
        switch (mapInfo.type) {
          case 'number': record[mapInfo.field] = toNumber(rawValue); break;
          case 'price': record[mapInfo.field] = toPrice(rawValue); break;
          case 'string':
            record[mapInfo.field] = mapInfo.field === 'barcode' ? toBarcode(rawValue) : toString(rawValue);
            break;
          case 'array': record[mapInfo.field] = parseArrayField(rawValue); break;
        }
      }

      if (previewRows.length < 5) {
        previewRows.push({ row: rowNum, data: { ...record } });
      }

      const allFieldsNull = Object.values(record).every(v => v === null || v === undefined);
      if (allFieldsNull) { skipped++; continue; }

      batchRows.push({ rowNum, data: record, record });
    }

    // Insert in batches using Prisma
    for (let i = 0; i < batchRows.length; i += BATCH_SIZE) {
      const batch = batchRows.slice(i, i + BATCH_SIZE);

      try {
        await db.$transaction(
          batch.map(({ data }) =>
            db.product.create({ data })
          )
        );

        for (const { rowNum, record } of batch) {
          imported++;
          if (record.price != null && record.price !== 0) withPrice++;
          else withoutPrice++;
          successDetails.push({
            row: rowNum,
            sr: record.sr ?? null,
            description: record.englishDescription ?? null,
            ndNumber: record.ndNumber ?? null,
          });
        }
      } catch (err: any) {
        // Batch failed — retry row-by-row
        for (const { rowNum, data, record } of batch) {
          try {
            await db.product.create({ data });
            imported++;
            if (record.price != null && record.price !== 0) withPrice++;
            else withoutPrice++;
            successDetails.push({
              row: rowNum,
              sr: record.sr ?? null,
              description: record.englishDescription ?? null,
              ndNumber: record.ndNumber ?? null,
            });
          } catch (singleErr: any) {
            errors++;
            errorDetails.push({ row: rowNum, error: singleErr?.message || String(singleErr) });
          }
        }
      }
    }

    const elapsedMs = Date.now() - importStartTime;
    const totalProcessed = imported + errors + skipped;

    return NextResponse.json({
      imported,
      errors,
      skipped,
      total: totalProcessed,
      withPrice,
      withoutPrice,
      elapsedMs,
      rawHeaders: headers,
      columnMapping: mappedHeaders,
      unmappedColumns: unmapped,
      previewRows: previewRows.length > 0 ? previewRows : undefined,
      successDetails: successDetails.length > 0 ? successDetails : undefined,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 50) : undefined,
    });
  } catch (error: any) {
    console.error('[IMPORT] Fatal error:', error);
    return NextResponse.json({
      error: 'Failed to import Excel file: ' + (error?.message || String(error)),
      imported: 0, errors: 0, total: 0, skipped: 0,
    }, { status: 500 });
  }
}
