'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  COLUMN_DEFS,
  resolveImageLinks,
  resolveVariants,
  type ColumnDef,
} from '@/lib/lookups';
import type { Product } from '@/store/inventory-store';

// Fields tracked for change detection (same set as Excel export)
const TRACKED_FIELDS = new Set([
  'productId', 'sku', 'ndNumber', 'barcode', 'legacyCode', 'brand', 'model',
  'department', 'category', 'subcategory', 'productFamily', 'productType',
  'nameAr', 'enCatalog', 'nameEn', 'shortDescAr', 'shortDescEn', 'longDescAr', 'longDescEn',
  'color', 'material', 'capacity', 'capacityUnit', 'weight', 'weightUnit',
  'length', 'width', 'height', 'diameter', 'dimensionUnit',
  'countryOfOrigin', 'unit', 'minSalesMultiples', 'defaultPrice',
  'seoTitleEn', 'seoTitleAr', 'seoDescriptionEn', 'seoDescriptionAr', 'searchKeywords',
  'internalNotes', 'validationStatus', 'confidenceScore', 'pieces', 'setCount', 'shape', 'finish', 'additionalInfo',
]);

function isFieldModified(product: Product, field: string): boolean {
  if (!product.original || !TRACKED_FIELDS.has(field)) return false;
  const currentValue = (product as any)[field];
  const originalValue = field === 'productId' ? product.original.origProductId : (product.original as any)[field];
  const currentStr = currentValue == null ? '' : String(currentValue).trim();
  const originalStr = originalValue == null ? '' : String(originalValue).trim();
  return currentStr !== originalStr;
}

/**
 * Get the primary image URL for a product.
 *
 * Mirrors the same logic used by the ImageGallery component that renders
 * images on the Product Details page:
 *   1. driveFileId → build a thumbnail URL (most reliable for Google Drive)
 *   2. thumbnailUrl → use as-is
 *   3. imageUrl → fallback
 */
function getPrimaryImageUrl(product: Product): string | null {
  if (!product.images || product.images.length === 0) return null;
  const sorted = [...product.images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
  const img = sorted[0];
  if (img.driveFileId) {
    return `https://drive.google.com/thumbnail?id=${img.driveFileId}&sz=w400`;
  }
  if (img.thumbnailUrl) return img.thumbnailUrl;
  if (img.imageUrl) return img.imageUrl;
  return null;
}

function getCellValue(product: Product, def: ColumnDef, allProducts: Product[]): string {
  let value: any;
  if (def.field === 'imageLinks') value = resolveImageLinks(product);
  else if (def.field === 'variants') value = resolveVariants(product, allProducts);
  else if (def.field.startsWith('old') && def.field.length > 3) {
    // Handle "Old {field}" columns — read from the oldValues JSON
    const originalField = def.field.charAt(3).toLowerCase() + def.field.slice(4);
    const oldValuesJson = (product as any).oldValues;
    if (!oldValuesJson) {
      value = '';
    } else {
      try {
        const parsed = JSON.parse(oldValuesJson);
        value = (parsed && parsed[originalField]) ?? '';
      } catch {
        value = '';
      }
    }
  }
  else value = (product as any)[def.field];
  if (value == null) return '';
  const str = String(value);
  return str.split('\n')[0] || '';
}

interface PrintReportProps {
  srFrom: number | null;
  srTo: number | null;
  selectedFields: string[] | null;
  orientation: 'portrait' | 'landscape';
  onlyModified?: boolean;
}

interface FetchProgress {
  current: number;
  total: number;
}

export function PrintReport({ srFrom, srTo, selectedFields, orientation, onlyModified }: PrintReportProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({ current: 0, total: 0 });

  // Determine which columns to include
  const cols: ColumnDef[] = useMemo(() => {
    if (!selectedFields || selectedFields.length === 0) return COLUMN_DEFS;
    const filtered = COLUMN_DEFS.filter((d) => selectedFields.includes(d.field));
    return filtered.length > 0 ? filtered : COLUMN_DEFS;
  }, [selectedFields]);

  // Fetch all products (paginated)
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const all: Product[] = [];
        const pageSize = 100;
        let page = 1;
        let total = 0;

        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', String(pageSize));
        params.set('sortBy', 'sourceRow');
        params.set('sortOrder', 'asc');
        if (srFrom != null && srTo != null) {
          params.set('sourceRowMin', String(srFrom));
          params.set('sourceRowMax', String(srTo));
        }
        if (onlyModified) {
          params.set('onlyModified', '1');
        }

        const firstRes = await fetch(`/api/products?${params.toString()}`);
        if (!firstRes.ok) throw new Error(`Failed to fetch: ${firstRes.status}`);
        const firstData = await firstRes.json();
        all.push(...firstData.products);
        total = firstData.total;
        if (cancelled) return;
        setFetchProgress({ current: all.length, total });

        const totalPages = Math.ceil(total / pageSize);
        for (page = 2; page <= totalPages; page++) {
          const p = new URLSearchParams(params);
          p.set('page', String(page));
          const res = await fetch(`/api/products?${p.toString()}`);
          if (!res.ok) throw new Error(`Failed to fetch page ${page}`);
          const data = await res.json();
          all.push(...data.products);
          if (cancelled) return;
          setFetchProgress({ current: all.length, total });
        }

        setProducts(all);

        // When onlyModified, sort by updatedListSerial for consistent ordering
        if (onlyModified) {
          setProducts((prev) => {
            const sorted = [...prev].sort((a: any, b: any) => {
              const aSerial = a.updatedListSerial;
              const bSerial = b.updatedListSerial;
              if (aSerial != null && bSerial != null) return aSerial - bSerial;
              if (aSerial != null) return -1;
              if (bSerial != null) return 1;
              return (a.sourceRow || 0) - (b.sourceRow || 0);
            });
            return sorted;
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [srFrom, srTo]);

  const reportDate = new Date().toLocaleString();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto" />
          <div>
            <p className="text-lg font-medium">Loading products…</p>
            {fetchProgress.total > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {fetchProgress.current} / {fetchProgress.total} products fetched
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold">Failed to load report</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => window.close()} variant="outline">Close</Button>
        </Card>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold">No products found</h2>
          <p className="text-sm text-muted-foreground">
            No products match the selected filters. Try adjusting the serial number range.
          </p>
          <Button onClick={() => window.close()} variant="outline">Close</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`report-container ${orientation}`}>
      {/* Dynamic page orientation — @page can't be scoped via CSS class,
          so we inject it here based on the selected orientation. */}
      <style>{`@page { size: A4 ${orientation}; margin: 10mm; }`}</style>

      {/* ── Screen-only toolbar (hidden in print) ── */}
      <div className="no-print screen-toolbar">
        <div className="toolbar-left">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.close()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Close
          </Button>
          <div className="toolbar-info">
            <h1 className="text-base font-bold">Product Catalog Report</h1>
            <p className="text-xs text-muted-foreground">
              {products.length} products · {cols.length} columns · {orientation}
            </p>
          </div>
        </div>
        <div className="toolbar-right">
          <Button onClick={() => window.print()} className="gap-2" size="sm">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* ── Report header (visible in print) ── */}
      <div className="report-header">
        <div className="header-left">
          <h1 className="report-title">Al-Nassim Product Catalog</h1>
          <p className="report-subtitle">
            {products.length} products · {cols.length} columns · {orientation === 'landscape' ? 'Landscape' : 'Portrait'} A4
          </p>
        </div>
        <div className="header-right">
          <p className="report-meta">Generated: {reportDate}</p>
          {srFrom != null && srTo != null && (
            <p className="report-meta">Range: SR {srFrom}–{srTo}</p>
          )}
        </div>
      </div>

      {/* ── Product table ── */}
      <table className="report-table">
        <thead>
          <tr>
            <th className="col-image">Image</th>
            {cols.map((def) => (
              <th key={def.field} className={`col-${def.type}`}>
                {def.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product, rowIdx) => (
            <tr key={product.id} className={rowIdx % 2 === 1 ? 'alt-row' : ''}>
              <td className="col-image">
                {(() => {
                  const url = getPrimaryImageUrl(product);
                  if (!url) return <span className="no-image">—</span>;
                  return (
                    <img
                      src={url}
                      alt={product.nameEn || `Product ${product.sourceRow}`}
                      className="product-image"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  );
                })()}
              </td>
              {cols.map((def) => {
                const value = getCellValue(product, def, products);
                const modified = isFieldModified(product, def.field);
                return (
                  <td
                    key={def.field}
                    className={modified ? 'modified-cell' : ''}
                  >
                    {value || <span className="empty-value">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Report footer ── */}
      <div className="report-footer">
        <p>End of report — {products.length} products</p>
      </div>
    </div>
  );
}
