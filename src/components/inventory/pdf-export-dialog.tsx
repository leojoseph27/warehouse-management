'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, FileText, FileImage } from 'lucide-react';
import { COLUMN_DEFS, COLUMN_GROUPS, type ColumnDef } from '@/lib/lookups';
import { generatePdfCatalog, type PdfProgress } from '@/lib/pdf-generator';
import { toast } from 'sonner';

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for configuring and triggering a client-side PDF export.
 *
 * The PDF is generated entirely in the browser using jsPDF + jsPDF-AutoTable.
 * No server-side function is needed — product data is fetched from the
 * existing /api/products endpoint, and images are loaded directly from
 * Google Drive URLs.
 *
 * Features:
 *   - Optional serial-number range filter (same as Excel export)
 *   - "All columns" (default) vs "Select specific columns" toggle
 *   - Column selection with checkboxes, grouped by section
 *   - Group-level select-all/deselect-all with indeterminate state
 *   - Progress indicator during fetching, image loading, and generation
 *   - Multi-page PDF with repeating headers, red font for modified fields,
 *     and primary image as the first column
 */
export function PdfExportDialog({
  open,
  onOpenChange,
}: PdfExportDialogProps) {
  const [mode, setMode] = useState<'all' | 'select'>('all');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<PdfProgress | null>(null);
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

  const selectAll = () => {
    setSelectedFields(new Set(COLUMN_DEFS.map((d) => d.field)));
  };

  const deselectAll = () => {
    setSelectedFields(new Set());
  };

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
    setIsExporting(true);
    setProgress({ stage: 'fetching', current: 0, total: 0, message: 'Starting…' });

    try {
      await generatePdfCatalog({
        srFrom,
        srTo,
        selectedFields: mode === 'select' ? Array.from(selectedFields) : null,
        onProgress: (p) => setProgress(p),
      });
      toast.success('PDF generated and downloaded successfully.');
      onOpenChange(false);
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast.error(err.message || 'Failed to generate PDF');
      setProgress({ stage: 'error', current: 0, total: 0, message: err.message || 'Failed' });
    } finally {
      setIsExporting(false);
    }
  };

  // Progress percentage for the progress bar
  const progressPercent = useMemo(() => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  }, [progress]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Export PDF Catalog
          </DialogTitle>
        </DialogHeader>

        {/* Info banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3 flex items-start gap-2">
          <FileImage className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-800 space-y-1">
            <p>
              Generates a <strong>multi-page PDF</strong> with the product's <strong>primary image</strong> as the
              first column, followed by the selected fields — same order as the Excel export.
            </p>
            <p>
              Includes repeating headers, red font for modified fields, and auto-fitted columns.
              Generated in your browser — no server processing required.
            </p>
          </div>
        </div>

        {/* Progress indicator (shown during export) */}
        {isExporting && progress && (
          <div className="space-y-2 border rounded-md p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {progress.stage === 'fetching' && 'Fetching products…'}
                {progress.stage === 'images' && 'Loading primary images…'}
                {progress.stage === 'generating' && 'Generating PDF…'}
                {progress.stage === 'done' && 'Complete!'}
                {progress.stage === 'error' && 'Error'}
              </span>
              {progress.total > 0 && (
                <span className="text-xs text-muted-foreground">
                  {progress.current} / {progress.total}
                </span>
              )}
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-[10px] text-muted-foreground">{progress.message}</p>
          </div>
        )}

        {/* SR Range filter (optional) */}
        {!isExporting && (
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
              Only export products within a specific source-row range. Leave empty to export all.
            </p>
          </div>
        )}

        {/* Mode toggle */}
        {!isExporting && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Columns to include</p>
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
                <p className="text-xs text-muted-foreground">Include every product field in the PDF</p>
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
        )}

        {/* Column selection (only visible in "select" mode, hidden during export) */}
        {mode === 'select' && !isExporting && (
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

            <ScrollArea className="h-[35vh] border rounded-md p-2">
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
                            className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-accent text-xs"
                          >
                            <Checkbox
                              checked={selectedFields.has(field.field)}
                              onCheckedChange={() => toggleField(field.field)}
                            />
                            <span className="truncate">{field.header}</span>
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            {isExporting ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (mode === 'select' && selectedCount === 0)}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {isExporting ? 'Generating…' : 'Export PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
