'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  COLUMN_DEFS,
  COLUMN_GROUPS,
  resolveImageLinks,
  resolveVariants,
  type ColumnDef,
} from '@/lib/lookups';
import type { Product } from '@/store/inventory-store';

// ── Fields tracked for change detection (same as Excel export) ──
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
 * This mirrors the EXACT same logic used by the ImageGallery component
 * (src/components/inventory/image-gallery.tsx line 146-154) that successfully
 * renders images on the Product Details page:
 *
 *   1. If driveFileId is available → build a thumbnail URL with a size param
 *      (this is the most reliable URL for Google Drive images)
 *   2. Else if thumbnailUrl is available → use it directly
 *   3. Else if imageUrl is available → use it as a fallback
 *
 * The Google Drive "uc?export=view" URL (stored in imageUrl) sometimes
 * doesn't load in <img> tags due to redirect chains. The thumbnail URL
 * (https://drive.google.com/thumbnail?id=...&sz=w1000) is more reliable.
 *
 * We use sz=w400 here (smaller than the w1000/w2000 used in ImageGallery)
 * because the report shows small 40px thumbnails — no need for high-res.
 */
function getPrimaryImageUrl(product: Product): string | null {
  if (!product.images || product.images.length === 0) return null;
  // Sort: primary image first, then by displayOrder
  const sorted = [...product.images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
  const img = sorted[0];

  // Same priority as ImageGallery.openPreview():
  // 1. driveFileId → build thumbnail URL (most reliable)
  // 2. thumbnailUrl → use as-is
  // 3. imageUrl → fallback
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
  else value = (product as any)[def.field];
  if (value == null) return '';
  const str = String(value);
  // For multi-line values, show only first line in the report table
  return str.split('\n')[0] || '';
}

interface PrintReportProps {
  srFrom: number | null;
  srTo: number | null;
  selectedFields: string[] | null;
  orientation: 'portrait' | 'landscape';
}

interface FetchProgress {
  current: number;
  total: number;
}

export function PrintReport({ srFrom, srTo, selectedFields, orientation }: PrintReportProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({ current: 0, total: 0 });
  const [imagesLoaded, setImagesLoaded] = useState(0);

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
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [srFrom, srTo]);

  // NOTE: Auto-print is DISABLED until image rendering is verified.
  // The user must click the "Print / Save as PDF" button manually.
  // This is intentional — the preview must be the source of truth, and
  // we need to confirm images render correctly before enabling print.

  const totalImages = products.filter((p) => getPrimaryImageUrl(p)).length;
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
      {/* Dynamic page orientation style — @page can't be scoped via CSS class,
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
          <Badge
            variant={imagesLoaded === totalImages ? 'default' : imagesLoaded > 0 ? 'secondary' : 'destructive'}
            className="text-xs"
            title="Number of images successfully loaded"
          >
            {imagesLoaded}/{totalImages} images
          </Badge>
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
                      // referrerPolicy="no-referrer" is CRITICAL for Google Drive
                      // images. Without it, Google Drive may reject the request
                      // based on the Referer header, causing the image to fail
                      // loading (showing a blank/broken image icon).
                      // The Product Details page's ImageGallery also benefits
                      // from this implicitly because it's loaded within the
                      // main app shell, but the print-report page is a standalone
                      // route that needs this explicitly.
                      referrerPolicy="no-referrer"
                      onLoad={() => setImagesLoaded((prev) => prev + 1)}
                      onError={(e) => {
                        console.error('[PrintReport] Image failed to load:', url);
                        const imgEl = e.target as HTMLImageElement;
                        imgEl.style.display = 'none';
                        // Show a small "img" text placeholder so we can see
                        // which images failed (for debugging)
                        const parent = imgEl.parentElement;
                        if (parent) {
                          parent.innerHTML = '<span class="no-image" title="Failed: ' + url + '">✗</span>';
                        }
                      }}
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
                    title={modified ? 'Modified from original' : undefined}
                  >
                    {value || <span className="empty-value">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Report footer (page number via CSS @page) ── */}
      <div className="report-footer">
        <p>End of report — {products.length} products</p>
      </div>
    </div>
  );
}
