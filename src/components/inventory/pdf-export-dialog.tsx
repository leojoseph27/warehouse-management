'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, FileImage } from 'lucide-react';
import { COLUMN_DEFS, COLUMN_GROUPS, type ColumnDef } from '@/lib/lookups';
import { toast } from 'sonner';

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Base URL for the export endpoint (without query params).
   *  The dialog appends ?srFrom=&srTo=&columns= based on user selections. */
  baseUrl: string;
  /** Optional initial serial-number range filter. If set, the PDF only
   *  includes products within this range. The user can edit it in the dialog. */
  srFrom?: number | null;
  srTo?: number | null;
}

/**
 * Dialog for configuring and triggering a PDF export.
 *
 * Features:
 *   - Optional serial-number range filter (same as Excel export)
 *   - "All columns" (default) vs "Select columns" toggle
 *   - When "Select columns" is on, shows checkboxes grouped by section
 *   - "Select all" / "Deselect all" quick actions
 *   - Shows a live count of selected columns
 *   - On export, builds the URL with the selected columns and triggers download
 *
 * The first column of the PDF is always the product's primary image — it is
 * NOT in the column selection list because it's always included.
 */
export function PdfExportDialog({
  open,
  onOpenChange,
  baseUrl,
  srFrom: initialSrFrom,
  srTo: initialSrTo,
}: PdfExportDialogProps) {
  // "all" = export all columns; "select" = user picks specific columns
  const [mode, setMode] = useState<'all' | 'select'>('all');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  // Serial-number range filter (string input — parsed on export)
  const [srRange, setSrRange] = useState<string>(
    initialSrFrom != null && initialSrTo != null ? `${initialSrFrom}-${initialSrTo}` : ''
  );
  const [srRangeError, setSrRangeError] = useState('');

  // Build a map of field → ColumnDef for quick lookup
  const fieldToDef = useMemo(() => {
    const map = new Map<string, ColumnDef>();
    for (const def of COLUMN_DEFS) map.set(def.field, def);
    return map;
  }, []);

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

  const toggleGroup = (groupName: string, fields: ColumnDef[]) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      const allSelected = fields.every((f) => next.has(f.field));
      if (allSelected) {
        // Deselect all in this group
        for (const f of fields) next.delete(f.field);
      } else {
        // Select all in this group
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

  /** Parse the SR range input string. Returns {from, to} or null if invalid. */
  const parseSrRange = (input: string): { from: number; to: number } | null => {
    const trimmed = input.trim();
    if (!trimmed) return null; // empty = no filter (export all)
    const m = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) return null;
    const from = parseInt(m[1], 10);
    const to = parseInt(m[2], 10);
    if (from > to) return null;
    return { from, to };
  };

  const handleExport = async () => {
    // Validate SR range if provided
    let finalSrFrom: number | null = null;
    let finalSrTo: number | null = null;
    if (srRange.trim()) {
      const parsed = parseSrRange(srRange);
      if (!parsed) {
        setSrRangeError('Invalid format. Use: 1-7, 25-40');
        return;
      }
      finalSrFrom = parsed.from;
      finalSrTo = parsed.to;
    }
    setSrRangeError('');

    setIsExporting(true);
    try {
      // Build the URL with query params
      const params = new URLSearchParams();
      if (finalSrFrom != null && finalSrTo != null) {
        params.set('srFrom', String(finalSrFrom));
        params.set('srTo', String(finalSrTo));
      }
      if (mode === 'select' && selectedCount > 0) {
        // Only include selected columns; if 0 selected in "select" mode,
        // fall back to all (the API also does this)
        params.set('columns', Array.from(selectedFields).join(','));
      }

      const url = params.toString()
        ? `${baseUrl}?${params.toString()}`
        : baseUrl;

      // Trigger download via a hidden anchor (browser handles the download)
      const a = document.createElement('a');
      a.href = url;
      a.download = ''; // let the server set the filename via Content-Disposition
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('PDF export started — your download will begin shortly.');
      onOpenChange(false);
    } catch (err: any) {
      console.error('PDF export error:', err);
      toast.error(err.message || 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

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
              The PDF includes a <strong>primary image column</strong> as the first column,
              followed by the selected product fields — same order as the Excel export.
            </p>
            <p>
              Multi-page support with repeating headers, red font for modified fields,
              and auto-fitted column widths.
            </p>
          </div>
        </div>

        {/* SR Range filter (optional) */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Serial Number Range (optional)</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 1-7, 25-40 (leave empty for all products)"
              value={srRange}
              onChange={(e) => { setSrRange(e.target.value); setSrRangeError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleExport(); }}
              disabled={isExporting}
              className="h-9"
            />
          </div>
          {srRangeError && (
            <p className="text-xs text-destructive">{srRangeError}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Only export products within a specific source-row range. Leave empty to export all.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Columns to include</p>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
            <input
              type="radio"
              name="pdfMode"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
              className="accent-purple-600"
              disabled={isExporting}
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
              disabled={isExporting}
            />
            <div>
              <p className="text-sm font-medium">Select specific columns</p>
              <p className="text-xs text-muted-foreground">
                Choose which fields to include {mode === 'select' && selectedCount > 0 && (
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="h-7 text-xs"
                  disabled={isExporting}
                >
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

            <ScrollArea className="h-[40vh] border rounded-md p-2">
              <div className="space-y-3">
                {COLUMN_GROUPS.map((group) => {
                  const fields = group.fields;
                  const allSelected = fields.every((f) => selectedFields.has(f.field));
                  const someSelected = fields.some((f) => selectedFields.has(f.field));

                  return (
                    <div key={group.name} className="space-y-1.5">
                      {/* Group header with select-all toggle */}
                      <div className="flex items-center gap-2 pb-1 border-b">
                        <Checkbox
                          id={`group-${group.name}`}
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={() => toggleGroup(group.name, fields)}
                          disabled={isExporting}
                        />
                        <label
                          htmlFor={`group-${group.name}`}
                          className="text-xs font-semibold cursor-pointer flex-1"
                        >
                          {group.name}
                        </label>
                        <Badge variant="outline" className="text-[10px]">
                          {fields.filter((f) => selectedFields.has(f.field)).length}/{fields.length}
                        </Badge>
                      </div>

                      {/* Individual fields */}
                      <div className="grid grid-cols-2 gap-1 pl-6">
                        {fields.map((field) => (
                          <label
                            key={field.field}
                            className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-accent text-xs"
                          >
                            <Checkbox
                              id={`field-${field.field}`}
                              checked={selectedFields.has(field.field)}
                              onCheckedChange={() => toggleField(field.field)}
                              disabled={isExporting}
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
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
            {isExporting ? 'Generating PDF…' : 'Export PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

