'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useInventoryStore } from '@/store/inventory-store';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, AlertTriangle, Info, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface StageTiming {
  fileUpload: string;
  excelParsing: string;
  headerDetection: string;
  rowParsing: string;
  dataTransformation: string;
  bulkInsert: string;
  total: string;
}

interface ImportResult {
  imported: number;
  errors: number;
  skipped: number;
  total: number;
  error?: string;  // Error message from API
  withPrice?: number;
  withoutPrice?: number;
  elapsedMs?: number;
  timings?: StageTiming;
  rawHeaders?: string[];
  columnMapping?: Record<string, string>;
  unmappedColumns?: string[];
  previewRows?: { row: number; data: Record<string, any> }[];
  successDetails?: { row: number; nameEn: string | null; ndNumber: string | null }[];
  errorDetails?: { row: number; error: string }[];
}

interface ImportProgress {
  stage: string;
  progress: number;
  message: string;
}

export function ExcelImport() {
  const { setView, goBack } = useInventoryStore();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate progress stages during import
  useEffect(() => {
    if (!importing || !selectedFile) return;

    const stages: ImportProgress[] = [
      { stage: 'uploading', progress: 5, message: 'Uploading file...' },
      { stage: 'reading', progress: 15, message: 'Reading workbook...' },
      { stage: 'headers', progress: 25, message: 'Detecting headers...' },
      { stage: 'parsing', progress: 40, message: 'Parsing rows...' },
      { stage: 'transforming', progress: 55, message: 'Applying transformations...' },
      { stage: 'inserting', progress: 70, message: 'Inserting to database...' },
      { stage: 'finalizing', progress: 90, message: 'Finalizing import...' },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage]);
        setProgressValue(stages[currentStage].progress);
        currentStage++;
      }
    }, 300);

    return () => clearInterval(interval);
  }, [importing, selectedFile]);

  const handleFileSelect = (file: File) => {
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setResult(null);
      setProgress(null);
      setProgressValue(0);
    } else {
      toast.error('Please select an Excel file (.xlsx, .xls, or .csv)');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setResult(null);
    setProgress({ stage: 'starting', progress: 0, message: 'Starting import...' });
    setProgressValue(0);

    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      const data: ImportResult = await res.json();
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Set progress to complete
      setProgress({ stage: 'complete', progress: 100, message: 'Import complete!' });
      setProgressValue(100);

      if (res.ok) {
        setResult(data);
        if (data.imported > 0 && data.errors === 0) {
          toast.success(`Successfully imported ${data.imported} products in ${data.timings?.total || `${totalTime}ms`}`);
        } else if (data.imported > 0 && data.errors > 0) {
          toast.warning(`Imported ${data.imported} products with ${data.errors} errors`);
        } else if (data.imported === 0) {
          toast.error('No products were imported');
        }
        if (data.imported > 0) {
          setSelectedFile(null);
        }
      } else {
        toast.error(data.error || 'Failed to import Excel file');
        setResult(data as any);
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Failed to import Excel file');
      setProgress(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="sm" onClick={goBack} className="h-11 w-11 p-0 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold">Import from Excel</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Optimized bulk import with progress tracking</p>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1">
          <Zap className="h-3 w-3" />
          Fast
        </Badge>
      </div>

      {/* Performance Info */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="px-3 sm:px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs sm:text-sm text-emerald-700">
              Optimized import: bulk database inserts, combined queries, and stage-by-stage progress tracking
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Expected Format */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
          <CardTitle className="text-sm sm:text-base">Supported Columns</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-xs sm:text-sm text-muted-foreground space-y-2">
            <p>The importer will automatically match your column headers (case-insensitive):</p>
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2">
              {['sr', 'English Description', 'Arabic Description', 'ND Number', 'barcode', 'Colour', 'L', 'W', 'H', 'Made', 'Material', 'Additional INFO', 'PRICE', 'Pcs'].map((col) => (
                <Badge key={col} variant="outline" className="text-[10px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5">
                  {col}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs">
              Multi-value fields (Colour, Material, Additional Info) can be comma-separated: <code className="bg-muted px-1 rounded text-xs">Silver, Black, Gold</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 sm:pb-4">
          <div
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 text-muted-foreground/50" />
            {selectedFile ? (
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-11"
                  onClick={() => { setSelectedFile(null); setResult(null); setProgress(null); }}
                  disabled={importing}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your Excel file here
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
              className="hidden"
            />
          </div>

          {/* Progress Indicator */}
          {(importing || progress) && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="flex items-center gap-2">
                  {progress?.stage === 'complete' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {progress?.message || 'Processing...'}
                </span>
                <span className="text-muted-foreground">{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          )}

          <Button
            className="w-full mt-4 h-11"
            disabled={!selectedFile || importing}
            onClick={handleImport}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Products
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Result */}
      {result && (
        <div className="space-y-3">
          {/* Summary */}
          <Card>
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4 pb-3 sm:pb-4">
              {result.imported > 0 ? (
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base">Import Complete</p>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                      <p>Total rows: {result.total}</p>
                      <p className="text-emerald-600">Inserted: {result.imported}</p>
                      {result.withPrice != null && (
                        <p className="text-emerald-600">With price: {result.withPrice}</p>
                      )}
                      {result.withoutPrice != null && result.withoutPrice > 0 && (
                        <p className="text-amber-600">Without price: {result.withoutPrice}</p>
                      )}
                      {result.skipped > 0 && (
                        <p className="text-muted-foreground">Skipped (empty): {result.skipped}</p>
                      )}
                      {result.errors > 0 && (
                        <p className="text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Failed: {result.errors}
                        </p>
                      )}
                      {result.elapsedMs != null && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Duration: {result.elapsedMs < 1000 ? `${result.elapsedMs}ms` : `${(result.elapsedMs / 1000).toFixed(1)}s`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base">Import Issues</p>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                      <p>Total rows: {result.total}</p>
                      <p>Inserted: {result.imported}</p>
                      {result.skipped > 0 && <p>Skipped: {result.skipped}</p>}
                      {result.errors > 0 && <p>Failed: {result.errors}</p>}
                      {result.elapsedMs != null && (
                        <p className="text-xs">Duration: {result.elapsedMs < 1000 ? `${result.elapsedMs}ms` : `${(result.elapsedMs / 1000).toFixed(1)}s`}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Breakdown */}
          {result.timings && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File upload:</span>
                    <span className="font-mono">{result.timings.fileUpload}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Excel parsing:</span>
                    <span className="font-mono">{result.timings.excelParsing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Header detection:</span>
                    <span className="font-mono">{result.timings.headerDetection}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Row parsing:</span>
                    <span className="font-mono">{result.timings.rowParsing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data transform:</span>
                    <span className="font-mono">{result.timings.dataTransformation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bulk insert:</span>
                    <span className="font-mono">{result.timings.bulkInsert}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between text-sm font-medium">
                  <span>Total time:</span>
                  <span className="font-mono text-emerald-600">{result.timings.total}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Column Mapping Detected */}
          {result.rawHeaders && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500 shrink-0" />
                  Column Mapping
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Detected headers:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.rawHeaders.map((h) => (
                      <Badge key={h} variant="outline" className="text-[10px] font-mono">
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>

                {result.columnMapping && Object.keys(result.columnMapping).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Matched columns:</p>
                    <div className="space-y-1">
                      {Object.entries(result.columnMapping).map(([dbField, excelHeader]) => (
                        <div key={dbField} className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {excelHeader}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-foreground">{dbField}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.unmappedColumns && result.unmappedColumns.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Unmapped (ignored):</p>
                    <div className="flex flex-wrap gap-1">
                      {result.unmappedColumns.map((col) => (
                        <Badge key={col} variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          {col}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error Details */}
          {result.errorDetails && result.errorDetails.length > 0 && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Errors ({result.errorDetails.length}{result.errorDetails.length >= 50 ? '+' : ''})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="max-h-40 sm:max-h-48 overflow-y-auto space-y-1">
                  {result.errorDetails.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0">Row {err.row}:</span>
                      <span className="text-amber-600">{err.error}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons after import */}
          {result.imported > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setView('products')}
              >
                View Products
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={() => { setResult(null); setProgress(null); setProgressValue(0); }}
              >
                Import More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}