'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, FileSpreadsheet, FileImage, Columns } from 'lucide-react';
import { COLUMN_DEFS, COLUMN_GROUPS, type ColumnDef } from '@/lib/lookups';
import { toast } from 'sonner';

interface ExcelExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the export is filtered to only show modified products
   *  (used by the Updated List page). */
  onlyModified?: boolean;
}

/**
 * Dialog for configuring an Excel export.
 *
 * Offers two modes:
 *   - Excel Only: exports product data without images (fast, small file)
 *   - Excel with Images: embeds the primary image in the first column
 *     (slower, larger file, but images are visible inside the workbook)
 *
 * Both modes share the same column selection, SR range filter, and dataset
 * as the PDF Report and Print Preview, ensuring consistent output across
 * all export types.
 *
 * The dialog builds a URL with query params and triggers a direct download
 * via a hidden anchor element.
 */
export function ExcelExportDialog({ open, onOpenChange, onlyModified }: ExcelExportDialogProps) {
  const [mode, setMode] = useState<'all' | 'select'>('all');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [exportType, setExportType] = useState<'excel-only' | 'excel-with-images'>('excel-only');
  const [srRange, setSrRange] = useState('');
  const [srRangeError, setSrRangeError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const selectedCount = selectedFields.size;
  const totalColumns = COLUMN_DEFS.length;

  const toggleField = (field: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const toggleGroup = (fields: ColumnDef[]) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      const allSelected = fields.every((f) => next.has(f.field));
      if (allSelected) {
        for (const f of fields) next.delete(f.field);
      } else {
        for (const f of fields) next.add(f.field);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedFields(new Set(COLUMN_DEFS.map((d) => d.field)));
  const deselectAll = () => setSelectedFields(new Set());

  const parseSrRange = (input: string): { from: number; to: number } | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) return null;
    const from = parseInt(m[1], 10);
    const to = parseInt(m[2], 10);
    if (from > to) return null;
    return { from, to };
  };

  const handleExport = async () => {
    // Validate SR range if provided
    let srFrom: number | null = null;
    let srTo: number | null = null;
    if (srRange.trim()) {
      const parsed = parseSrRange(srRange);
      if (!parsed) {
        setSrRangeError('Invalid format. Use: 1-7, 25-40');
        return;
      }
      srFrom = parsed.from;
      srTo = parsed.to;
    }
    setSrRangeError('');

    // Build the export URL
    const params = new URLSearchParams();
    if (exportType === 'excel-with-images') {
      params.set('embedImages', 'true');
    }
    if (srFrom != null && srTo != null) {
      params.set('srFrom', String(srFrom));
      params.set('srTo', String(srTo));
    }
    if (mode === 'select' && selectedCount > 0) {
      params.set('columns', Array.from(selectedFields).join(','));
    }
    if (onlyModified) {
      params.set('onlyModified', '1');
    }

    const url = `/api/products/export?${params.toString()}`;
    const filename = exportType === 'excel-with-images'
      ? (srFrom != null && srTo != null
        ? `products_with_images_sr_${srFrom}_${srTo}.xlsx`
        : 'products_with_images.xlsx')
      : (srFrom != null && srTo != null
        ? `products_sr_${srFrom}_${srTo}.xlsx`
        : 'products_export.xlsx');

    setIsExporting(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Excel export downloaded successfully.');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Excel export error:', err);
      toast.error(err.message || 'Failed to export Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Export Excel
          </DialogTitle>
        </DialogHeader>

        {/* Export type selector */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Export Type</p>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
            <input
              type="radio"
              name="excelType"
              checked={exportType === 'excel-only'}
              onChange={() => setExportType('excel-only')}
              className="accent-green-600"
              disabled={isExporting}
            />
            <div>
              <p className="text-sm font-medium">Excel Only</p>
              <p className="text-xs text-muted-foreground">Product data without images — fast, small file</p>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
            <input
              type="radio"
              name="excelType"
              checked={exportType === 'excel-with-images'}
              onChange={() => setExportType('excel-with-images')}
              className="accent-green-600"
              disabled={isExporting}
            />
            <div>
              <p className="text-sm font-medium">Excel with Images</p>
              <p className="text-xs text-muted-foreground">Primary image embedded in first column — visible in the workbook</p>
            </div>
          </label>
        </div>

        {/* SR Range filter (optional) */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Serial Number Range (optional)</p>
          <Input
            placeholder="e.g. 1-7, 25-40 (leave empty for all products)"
            value={srRange}
            onChange={(e) => { setSrRange(e.target.value); setSrRangeError(''); }}
            disabled={isExporting}
            className="h-9"
          />
          {srRangeError && <p className="text-xs text-destructive">{srRangeError}</p>}
          <p className="text-[10px] text-muted-foreground">
            Only include products within a specific source-row range. Leave empty to export all.
          </p>
        </div>

        {/* Column selection mode */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Columns className="h-3 w-3" />
            Columns to include
          </p>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
            <input
              type="radio"
              name="excelColMode"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              className="accent-green-600"
              disabled={isExporting}
            />
            <div>
              <p className="text-sm font-medium">Export all columns ({totalColumns} fields)</p>
              <p className="text-xs text-muted-foreground">Include every product field in the export</p>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
            <input
              type="radio"
              name="excelColMode"
              checked={mode === 'select'}
              onChange={() => setMode('select')}
              className="accent-green-600"
              disabled={isExporting}
            />
            <div>
              <p className="text-sm font-medium">Select specific columns</p>
              <p className="text-xs text-muted-foreground">
                Choose which fields to include
                {mode === 'select' && selectedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px]">{selectedCount} selected</Badge>
                )}
              </p>
            </div>
          </label>
        </div>

        {/* Column selection (only visible in "select" mode) */}
        {mode === 'select' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Select columns to include</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs" disabled={isExporting}>
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="h-7 text-xs"
                  disabled={isExporting || selectedCount === 0}
                >
                  Deselect all
                </Button>
              </div>
            </div>

            {/* Column list — vertically scrollable with a fixed max height so it
                never overflows the dialog, and every column stays visible/
                selectable even with 60+ fields. Long names wrap cleanly. */}
            <div className="max-h-[55vh] min-h-[180px] overflow-y-auto border rounded-md p-2 updated-list-scroll">
              <div className="space-y-3">
                {COLUMN_GROUPS.map((group) => {
                  const fields = group.fields;
                  const allSelected = fields.every((f) => selectedFields.has(f.field));
                  const someSelected = fields.some((f) => selectedFields.has(f.field));
                  return (
                    <div key={group.name} className="space-y-1.5">
                      <div className="flex items-center gap-2 pb-1 border-b">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={() => toggleGroup(fields)}
                          disabled={isExporting}
                        />
                        <label className="text-xs font-semibold cursor-pointer flex-1">
                          {group.name}
                        </label>
                        <Badge variant="outline" className="text-[10px]">
                          {fields.filter((f) => selectedFields.has(f.field)).length}/{fields.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-6 items-start">
                        {fields.map((field) => (
                          <label
                            key={field.field}
                            className="flex items-start gap-2 cursor-pointer p-1 rounded hover:bg-accent text-xs min-w-0"
                          >
                            <Checkbox
                              checked={selectedFields.has(field.field)}
                              onCheckedChange={() => toggleField(field.field)}
                              disabled={isExporting}
                              className="shrink-0 mt-0.5"
                            />
                            <span className="break-words leading-tight">{field.header}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (mode === 'select' && selectedCount === 0)}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : exportType === 'excel-with-images' ? (
              <FileImage className="h-4 w-4" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {isExporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
