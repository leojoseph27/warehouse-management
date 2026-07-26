'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, FileImage, Printer, Columns } from 'lucide-react';
import { COLUMN_DEFS, COLUMN_GROUPS, type ColumnDef } from '@/lib/lookups';
import { toast } from 'sonner';

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, the export is filtered to only show modified products
   *  (used by the Updated List page). */
  onlyModified?: boolean;
}

/**
 * Dialog for configuring and opening the Print Report page.
 *
 * Instead of generating a PDF with a library, this opens a dedicated
 * /print-report page in a new browser tab. That page renders an HTML
 * report with print-optimized CSS, and the user prints/saves-as-PDF
 * via the browser's native print dialog (Ctrl+P / Cmd+P).
 *
 * Benefits:
 *   - No PDF library dependencies (no jsPDF, no pdfkit, no font files)
 *   - Browser handles image rendering natively (best quality)
 *   - Native print dialog gives full control (page size, margins, etc.)
 *   - HTML/CSS is easier to maintain than library-specific code
 *   - Works on every device/browser with zero configuration
 */
export function PdfExportDialog({ open, onOpenChange, onlyModified }: PdfExportDialogProps) {
  const [mode, setMode] = useState<'all' | 'select'>('all');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [srRange, setSrRange] = useState('');
  const [srRangeError, setSrRangeError] = useState('');

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

  const handleExport = () => {
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

    // Build the /print-report URL with query params
    const params = new URLSearchParams();
    params.set('orientation', orientation);
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

    const url = `/print-report?${params.toString()}`;

    // Open in a new tab so the user keeps the dashboard open
    window.open(url, '_blank');

    toast.success('Opening print report in a new tab…');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-purple-600" />
            Print Report / Export PDF
          </DialogTitle>
        </DialogHeader>

        {/* Info banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3 flex items-start gap-2">
          <FileImage className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-800 space-y-1">
            <p>
              Opens a <strong>print-optimized report</strong> in a new tab with the product's primary image
              as the first column, followed by the selected fields.
            </p>
            <p>
              Use the browser's <strong>Print</strong> dialog (Ctrl+P / Cmd+P) to print or save as PDF.
              The report includes repeating headers, page breaks, and red font for modified fields.
            </p>
          </div>
        </div>

        {/* Orientation selector */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Page Orientation</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrientation('portrait')}
              className={`flex items-center gap-2 p-3 rounded-md border text-left transition-colors ${
                orientation === 'portrait'
                  ? 'border-purple-600 bg-purple-50 text-purple-900'
                  : 'border-border hover:bg-accent'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-6 h-8 border-2 border-current rounded-sm" />
              </div>
              <div>
                <p className="text-sm font-medium">Portrait</p>
                <p className="text-[10px] text-muted-foreground">A4 vertical — fewer columns</p>
              </div>
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`flex items-center gap-2 p-3 rounded-md border text-left transition-colors ${
                orientation === 'landscape'
                  ? 'border-purple-600 bg-purple-50 text-purple-900'
                  : 'border-border hover:bg-accent'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="w-8 h-6 border-2 border-current rounded-sm" />
              </div>
              <div>
                <p className="text-sm font-medium">Landscape</p>
                <p className="text-[10px] text-muted-foreground">A4 horizontal — more columns</p>
              </div>
            </button>
          </div>
        </div>

        {/* SR Range filter (optional) */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Serial Number Range (optional)</p>
          <Input
            placeholder="e.g. 1-7, 25-40 (leave empty for all products)"
            value={srRange}
            onChange={(e) => { setSrRange(e.target.value); setSrRangeError(''); }}
            className="h-9"
          />
          {srRangeError && <p className="text-xs text-destructive">{srRangeError}</p>}
          <p className="text-[10px] text-muted-foreground">
            Only include products within a specific source-row range. Leave empty to export all.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Columns className="h-3 w-3" />
            Columns to include
          </p>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
            <input
              type="radio"
              name="pdfMode"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              className="accent-purple-600"
            />
            <div>
              <p className="text-sm font-medium">Export all columns ({totalColumns} fields)</p>
              <p className="text-xs text-muted-foreground">Include every product field in the report</p>
            </div>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
            <input
              type="radio"
              name="pdfMode"
              checked={mode === 'select'}
              onChange={() => setMode('select')}
              className="accent-purple-600"
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
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="h-7 text-xs"
                  disabled={selectedCount === 0}
                >
                  Deselect all
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[35vh] border rounded-md p-2 overflow-hidden">
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
                        />
                        <label className="text-xs font-semibold cursor-pointer flex-1">
                          {group.name}
                        </label>
                        <Badge variant="outline" className="text-[10px]">
                          {fields.filter((f) => selectedFields.has(f.field)).length}/{fields.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pl-6">
                        {fields.map((field) => (
                          <label
                            key={field.field}
                            className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-accent text-xs min-w-0"
                          >
                            <Checkbox
                              checked={selectedFields.has(field.field)}
                              onCheckedChange={() => toggleField(field.field)}
                              className="shrink-0"
                            />
                            <span className="truncate overflow-hidden">{field.header}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={mode === 'select' && selectedCount === 0}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Open Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
