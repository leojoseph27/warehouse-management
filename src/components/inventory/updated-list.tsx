'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileImage,
  FileText,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { useInventoryStore } from '@/store/inventory-store';
import { ProductTable } from './product-table';
import { ExcelExportDialog } from './excel-export-dialog';
import { PdfExportDialog } from './pdf-export-dialog';
import { toast } from 'sonner';

/**
 * Updated List — a dedicated workspace for reviewing modified products.
 *
 * This component wraps the existing ProductTable with:
 *   - A "Recently Updated" filter that is ALWAYS ON (onlyModified=1)
 *   - A Serial Number column (sequential 1, 2, 3...) for tracking progress
 *   - Export buttons for the Updated List dataset (Excel, Excel with Images,
 *     PDF, PDF with Images)
 *
 * The ProductTable component is reused as-is — no duplication. The
 * onlyModified filter is set when entering this view and cleared when
 * leaving.
 */
export function UpdatedList() {
  const { setView, setFilter, filterOnlyModified } = useInventoryStore();
  const [showExcelDialog, setShowExcelDialog] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);

  // Force onlyModified=true when entering the Updated List view
  useEffect(() => {
    if (!filterOnlyModified) {
      setFilter('filterOnlyModified', true as any);
    }
    // Cleanup: when leaving the Updated List, turn off the filter
    return () => {
      // Don't clear the filter here — it's cleared when navigating away
      // via the store's setView. We only set it ON if it wasn't already on.
    };
  }, [filterOnlyModified, setFilter]);

  return (
    <div className="space-y-3 pb-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('dashboard')}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Updated List
              <Badge variant="secondary" className="text-xs">Modified Products</Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Products that have been edited — track your work and review changes
            </p>
          </div>
        </div>

        {/* ── Export buttons ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExcelDialog(true)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPdfDialog(true)}
            className="gap-2"
          >
            <Printer className="h-4 w-4 text-rose-600" />
            PDF
          </Button>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800 flex items-start gap-2">
        <RefreshCw className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">This list shows only products that have been modified.</p>
          <p className="mt-0.5">Newly updated products automatically appear here. Use the export buttons above to export this list (with or without images).</p>
        </div>
      </div>

      {/* ── Product Table (reused — no duplication) ── */}
      <ProductTable />

      {/* ── Export Dialogs ── */}
      <ExcelExportDialog
        open={showExcelDialog}
        onOpenChange={setShowExcelDialog}
        onlyModified
      />
      <PdfExportDialog
        open={showPdfDialog}
        onOpenChange={setShowPdfDialog}
        onlyModified
      />
    </div>
  );
}
