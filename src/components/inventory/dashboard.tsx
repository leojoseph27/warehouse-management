'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useInventoryStore, DashboardStats, Product } from '@/store/inventory-store';
import {
  Package,
  Plus,
  Calendar,
  ImageOff,
  Barcode,
  Ruler,
  Upload,
  Download,
  Search,
  Trash2,
  Loader2,
  FileDown,
  Tag,
  Type,
  DollarSign,
  Edit3,
  Layers,
  ArrowRight,
  FolderCheck,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ExportProgressDialog } from './export-progress-dialog';

export function Dashboard() {
  const { setView, stats, setStats, setLoading } = useInventoryStore();
  const [isClearing, setIsClearing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isCheckingFolders, setIsCheckingFolders] = useState(false);
  const [exportMode, setExportMode] = useState<'excel-only' | 'excel-package' | 'excel-embedded' | 'excel-thumbnails'>('excel-only');
  const [imageQuality, setImageQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [thumbnailQuality, setThumbnailQuality] = useState<'small' | 'medium' | 'large'>('medium');
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressExportParams, setProgressExportParams] = useState<any>(null);
  const [progressFilename, setProgressFilename] = useState('');
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);
  const [srRange, setSrRange] = useState('');
  const [srRangeError, setSrRangeError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [resumableJob, setResumableJob] = useState<any | null>(null);
  const [recentExports, setRecentExports] = useState<any[]>([]);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStats();
    loadRecentProducts();
    loadResumableJob();
    loadRecentExports();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentProducts = async () => {
    setIsLoadingRecent(true);
    try {
      const res = await fetch('/api/products?limit=10&sortBy=recentlyAdded&sortOrder=desc');
      if (res.ok) {
        const data = await res.json();
        setRecentProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading recent products:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  // Resume support: check for in-progress jobs that can be resumed.
  const loadResumableJob = async () => {
    try {
      const res = await fetch('/api/export/list?status=processing&limit=1');
      if (res.ok) {
        const data = await res.json();
        if (data.jobs && data.jobs.length > 0) {
          setResumableJob(data.jobs[0]);
        }
      }
    } catch (error) {
      console.error('Error loading resumable job:', error);
    }
  };

  // Load recent export history (any status) for the dashboard panel.
  const loadRecentExports = async () => {
    try {
      const res = await fetch('/api/export/list?limit=5');
      if (res.ok) {
        const data = await res.json();
        setRecentExports(data.jobs || []);
      }
    } catch (error) {
      console.error('Error loading recent exports:', error);
    }
  };

  // Resume an in-progress job — opens the progress dialog in resume mode.
  const handleResume = () => {
    if (!resumableJob) return;
    setResumeJobId(resumableJob.id);
    setProgressExportParams(null);
    setProgressFilename(
      resumableJob.exportMode === 'excel-package'
        ? 'product_export_package.zip'
        : 'products_export.xlsx'
    );
    setResumableJob(null);
    setShowProgressDialog(true);
    setIsExporting(true);
  };

  // Dismiss the resume banner without resuming (job continues server-side).
  const handleDismissResume = () => {
    setResumableJob(null);
  };

  // Build the export URL based on the selected export mode
  const getExportUrl = (baseUrl: string): string => {
    const url = new URL(baseUrl, window.location.origin);
    if (exportMode === 'excel-package') {
      url.pathname = url.pathname.replace('/api/products/export', '/api/products/export-package');
      url.searchParams.set('quality', imageQuality);
    } else if (exportMode === 'excel-embedded') {
      url.searchParams.set('mode', 'embedded');
      url.searchParams.set('quality', imageQuality);
    }
    return url.toString();
  };

  // Download a blob from a URL and trigger a file download
  const downloadBlob = async (url: string, filename: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Export failed');
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  // Check and fix Google Drive folder organization — ensures every product's
  // images are in a folder named after the product's ND Number or Product ID.
  const handleCheckFolders = async () => {
    setIsCheckingFolders(true);
    toast.info('Checking Google Drive folders... This may take a while.');
    try {
      const res = await fetch('/api/images/check-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Done! Checked ${data.totalProducts} products, moved ${data.filesMoved} files, ${data.failures} failures. (${data.duration})`
        );
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to check folders');
      }
    } catch (error) {
      console.error('Error checking folders:', error);
      toast.error('Failed to check Drive folders');
    } finally {
      setIsCheckingFolders(false);
    }
  };

  // Group stats into categories for better organization
  const mainStats = [
    {
      title: 'Total Products',
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Added Today',
      value: stats?.productsAddedToday ?? 0,
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Modified',
      value: stats?.productsWithModifications ?? 0,
      icon: Edit3,
      color: 'text-red-600',
      bg: 'bg-red-50',
      description: 'Manually edited',
    },
    {
      title: 'Variant Groups',
      value: stats?.totalVariantGroups ?? 0,
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      description: 'Linked variants',
    },
  ];

  const issueStats = [
    {
      title: 'Missing Images',
      value: stats?.productsMissingImages ?? 0,
      icon: ImageOff,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'No Barcode',
      value: stats?.productsMissingBarcode ?? 0,
      icon: Barcode,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'No Dimensions',
      value: stats?.productsMissingDimensions ?? 0,
      icon: Ruler,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'No Classification',
      value: stats?.productsMissingClassification ?? 0,
      icon: Tag,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'No Name EN',
      value: stats?.productsMissingNameEn ?? 0,
      icon: Type,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      title: 'No Price',
      value: stats?.productsMissingPrice ?? 0,
      icon: DollarSign,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-responsive-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Product Inventory & Catalog Management</p>
        </div>
        <Button onClick={() => setView('add-product')} className="h-11 sm:h-10 px-4 w-full sm:w-auto">
          <Plus className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Resume export banner */}
      {resumableJob && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Loader2 className="h-4 w-4 text-blue-600 shrink-0 animate-spin" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                Export in progress — {resumableJob.percentage}% complete
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 truncate">
                {resumableJob.processedProducts} / {resumableJob.totalProducts} products • stage: {resumableJob.stage}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="default" onClick={handleResume} className="h-8">
              Resume
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismissResume} className="h-8">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Stats - Primary 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {mainStats.map((card) => (
          <Card
            key={card.title}
            className={cn('overflow-hidden', card.title === 'Variant Groups' && 'cursor-pointer hover:bg-accent/50 transition-colors')}
            onClick={card.title === 'Variant Groups' ? () => setView('variant-explorer') : undefined}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`${card.bg} p-2 sm:p-2.5 rounded-lg shrink-0`}>
                  <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl sm:text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight text-truncate">{card.title}</p>
                  {card.description && (
                    <p className="text-xs text-muted-foreground/70 leading-tight text-truncate hidden sm:block">{card.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Issue Stats - Collapsible section for mobile */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
          <CardTitle className="text-base sm:text-lg">Data Quality Issues</CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Products with missing or incomplete data
          </p>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          {/* Responsive grid: 2 on mobile, 3 on tablet, 6 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {issueStats.map((card) => (
              <div
                key={card.title}
                className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg border ${
                  card.value > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-border bg-muted/30'
                }`}
              >
                <div className={`${card.bg} p-1.5 sm:p-2 rounded shrink-0`}>
                  <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg sm:text-xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight text-truncate">{card.title}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          {/* 2x2 grid on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 sm:py-4 flex-col gap-1.5 sm:gap-2 min-h-[44px]"
              onClick={() => setView('add-product')}
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              <span className="text-xs">Add Product</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 sm:py-4 flex-col gap-1.5 sm:gap-2 min-h-[44px]"
              onClick={() => setView('import')}
            >
              <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              <span className="text-xs">Import Excel</span>
            </Button>
            <div className="relative" ref={exportMenuRef}>
              <Button
                variant="outline"
                className="h-auto py-3 sm:py-4 flex-col gap-1.5 sm:gap-2 w-full min-h-[44px]"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
              >
                {isExporting ? (
                  <span className="h-5 w-5 sm:h-6 sm:w-6 border-2 border-purple-600 border-t-transparent animate-spin rounded-full" />
                ) : (
                  <Download className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                )}
                <span className="text-xs">Export Excel</span>
              </Button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setShowExportMenu(false); setSrRangeError(''); }} />
                  <div className="absolute left-0 right-0 sm:left-0 sm:right-auto sm:w-80 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg p-3 space-y-3 max-h-[80vh] overflow-y-auto">
                    <p className="text-sm font-medium">Export Excel</p>

                    {/* Export Mode selector */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Export Mode</p>
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
                        <input
                          type="radio"
                          name="exportMode"
                          checked={exportMode === 'excel-only'}
                          onChange={() => setExportMode('excel-only')}
                          className="accent-purple-600"
                        />
                        <div>
                          <p className="text-sm">Excel Only</p>
                          <p className="text-[10px] text-muted-foreground">Standard export, no images</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
                        <input
                          type="radio"
                          name="exportMode"
                          checked={exportMode === 'excel-package'}
                          onChange={() => setExportMode('excel-package')}
                          className="accent-purple-600"
                        />
                        <div>
                          <p className="text-sm">Excel + Image Package</p>
                          <p className="text-[10px] text-muted-foreground">ZIP with organized image folders</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
                        <input
                          type="radio"
                          name="exportMode"
                          checked={exportMode === 'excel-thumbnails'}
                          onChange={() => setExportMode('excel-thumbnails')}
                          className="accent-purple-600"
                        />
                        <div>
                          <p className="text-sm">Excel + Live Thumbnails <Badge variant="secondary" className="text-[9px] ml-1">Recommended</Badge></p>
                          <p className="text-[10px] text-muted-foreground">Live image previews via Google Drive (no embedding)</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-accent">
                        <input
                          type="radio"
                          name="exportMode"
                          checked={exportMode === 'excel-embedded'}
                          onChange={() => setExportMode('excel-embedded')}
                          className="accent-purple-600"
                        />
                        <div>
                          <p className="text-sm">Excel + Embedded Images</p>
                          <p className="text-[10px] text-muted-foreground">Primary images embedded in workbook</p>
                        </div>
                      </label>
                    </div>

                    {/* Image Quality selector — only for image export modes */}
                    {(exportMode === 'excel-package' || exportMode === 'excel-embedded') && (
                      <div className="space-y-2 border-t pt-2">
                        <p className="text-xs font-medium text-muted-foreground">Image Quality</p>
                        <div className="flex gap-2">
                          {(['high', 'medium', 'low'] as const).map(q => (
                            <button
                              key={q}
                              onClick={() => setImageQuality(q)}
                              className={`flex-1 h-9 rounded-md text-xs capitalize border transition-colors ${
                                imageQuality === q
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-background hover:bg-accent border-border'
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Thumbnail Quality selector — only for excel-thumbnails mode */}
                    {exportMode === 'excel-thumbnails' && (
                      <div className="space-y-2 border-t pt-2">
                        <p className="text-xs font-medium text-muted-foreground">Thumbnail Quality</p>
                        <div className="flex gap-2">
                          {(['small', 'medium', 'large'] as const).map(q => (
                            <button
                              key={q}
                              onClick={() => setThumbnailQuality(q)}
                              className={`flex-1 h-9 rounded-md text-xs capitalize border transition-colors ${
                                thumbnailQuality === q
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-background hover:bg-accent border-border'
                              }`}
                            >
                              {q === 'small' ? 'Small (200px)' : q === 'medium' ? 'Medium (300px)' : 'Large (600px)'}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Controls the thumbnail URL size in the IMAGE() formula. Does not affect downloaded images.
                        </p>
                      </div>
                    )}

                    <div className="border-t" />

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-11 sm:h-9"
                      onClick={async () => {
                        setIsExporting(true);
                        setShowExportMenu(false);
                        try {
                          if (exportMode === 'excel-package' || exportMode === 'excel-embedded' || exportMode === 'excel-thumbnails') {
                            // Use async export job with progress dialog
                            setResumeJobId(null);
                            setProgressExportParams({
                              exportMode,
                              // For excel-thumbnails mode, quality carries the thumbnail quality.
                              // For excel-package/excel-embedded, quality carries the image quality.
                              quality: exportMode === 'excel-thumbnails' ? thumbnailQuality : imageQuality,
                            });
                            setProgressFilename(exportMode === 'excel-package' ? 'product_export_package.zip' : 'products_export.xlsx');
                            setShowProgressDialog(true);
                          } else {
                            // Standard Excel-only export (direct download)
                            const url = getExportUrl('/api/products/export');
                            await downloadBlob(url, 'products_export.xlsx');
                            setIsExporting(false);
                          }
                        } catch (err: any) {
                          toast.error(err.message || 'Export failed');
                          setIsExporting(false);
                        }
                      }}
                      disabled={isExporting}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export All Products
                    </Button>

                    <div className="border-t" />

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Export by Serial Number Range</p>
                      <Input
                        placeholder="e.g. 1-7, 25-40"
                        value={srRange}
                        onChange={(e) => { setSrRange(e.target.value); setSrRangeError(''); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSrRangeError('');
                            const trimmed = srRange.trim();
                            const m = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
                            if (!m) { setSrRangeError('Invalid format. Use: 1-7, 25-40'); return; }
                            const from = parseInt(m[1], 10), to = parseInt(m[2], 10);
                            if (from > to) { setSrRangeError('Start cannot be greater than end.'); return; }
                            setIsExporting(true);
                            if (exportMode === 'excel-package' || exportMode === 'excel-embedded' || exportMode === 'excel-thumbnails') {
                              // Use chunked pipeline for image exports
                              setResumeJobId(null);
                              setProgressExportParams({
                                exportMode,
                                quality: exportMode === 'excel-thumbnails' ? thumbnailQuality : imageQuality,
                                srFrom: from,
                                srTo: to,
                              });
                              setProgressFilename(exportMode === 'excel-package'
                                ? `product_export_sr_${from}_${to}.zip`
                                : `products_sr_${from}_${to}.xlsx`);
                              setShowExportMenu(false);
                              setShowProgressDialog(true);
                            } else {
                              // Direct download for excel-only mode
                              const url = getExportUrl(`/api/products/export?srFrom=${from}&srTo=${to}`);
                              const filename = `products_sr_${from}_${to}.xlsx`;
                              downloadBlob(url, filename)
                                .then(() => { setShowExportMenu(false); setSrRange(''); })
                                .catch(err => toast.error(err.message || 'Export failed'))
                                .finally(() => setIsExporting(false));
                            }
                          }
                        }}
                        className="h-11 sm:h-9 text-sm"
                        disabled={isExporting}
                      />
                      {srRangeError && <p className="text-xs text-destructive">{srRangeError}</p>}
                      <Button
                        size="sm"
                        className="w-full h-11 sm:h-9"
                        disabled={isExporting || !srRange.trim()}
                        onClick={() => {
                          setSrRangeError('');
                          const trimmed = srRange.trim();
                          const m = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
                          if (!m) { setSrRangeError('Invalid format. Use: 1-7, 25-40'); return; }
                          const from = parseInt(m[1], 10), to = parseInt(m[2], 10);
                          if (from > to) { setSrRangeError('Start cannot be greater than end.'); return; }
                          setIsExporting(true);
                          if (exportMode === 'excel-package' || exportMode === 'excel-embedded' || exportMode === 'excel-thumbnails') {
                            // Use chunked pipeline for image exports
                            setResumeJobId(null);
                            setProgressExportParams({
                              exportMode,
                              quality: exportMode === 'excel-thumbnails' ? thumbnailQuality : imageQuality,
                              srFrom: from,
                              srTo: to,
                            });
                            setProgressFilename(exportMode === 'excel-package'
                              ? `product_export_sr_${from}_${to}.zip`
                              : `products_sr_${from}_${to}.xlsx`);
                            setShowExportMenu(false);
                            setShowProgressDialog(true);
                          } else {
                            // Direct download for excel-only mode
                            const url = getExportUrl(`/api/products/export?srFrom=${from}&srTo=${to}`);
                            const filename = `products_sr_${from}_${to}.xlsx`;
                            downloadBlob(url, filename)
                              .then(() => { setShowExportMenu(false); setSrRange(''); })
                              .catch(err => toast.error(err.message || 'Export failed'))
                              .finally(() => setIsExporting(false));
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Range
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Check Drive Folders — ensures all product images are in the
                correct folder (ND Number or Product ID) on Google Drive */}
            <Button
              variant="outline"
              className="h-auto py-3 sm:py-4 flex-col gap-1.5 sm:gap-2 min-h-[44px]"
              onClick={handleCheckFolders}
              disabled={isCheckingFolders}
            >
              {isCheckingFolders ? (
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 animate-spin" />
              ) : (
                <FolderCheck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              )}
              <span className="text-xs">{isCheckingFolders ? 'Checking...' : 'Check Folders'}</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto py-3 sm:py-4 flex-col gap-1.5 sm:gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 min-h-[44px]"
                  disabled={isClearing || (stats?.totalProducts ?? 0) === 0}
                >
                  {isClearing ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-destructive animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                  )}
                  <span className="text-xs">Clear All</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all products?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>all {stats?.totalProducts ?? 0} products</strong>,
                    all product images from the database, and all image files from storage.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      setIsClearing(true);
                      try {
                        const res = await fetch('/api/products/cleanup?mode=all', { method: 'DELETE' });
                        if (res.ok) {
                          const data = await res.json();
                          toast.success(data.message || 'All data cleared');
                          await loadStats();
                          setRecentProducts([]);
                        } else {
                          toast.error('Failed to clear data');
                        }
                      } catch {
                        toast.error('Failed to clear data');
                      } finally {
                        setIsClearing(false);
                      }
                    }}
                  >
                    Yes, delete everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Empty State or Recent Products */}
      {(stats?.totalProducts ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 sm:py-12 text-center px-4">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-base sm:text-lg font-medium text-muted-foreground">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Import an Excel file to begin.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Button onClick={() => setView('import')} className="h-11 sm:h-10 w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
              <Button variant="outline" onClick={() => setView('add-product')} className="h-11 sm:h-10 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Browse All Products Button */}
          <Button
            variant="outline"
            className="w-full h-12 sm:h-14 text-base justify-between"
            onClick={() => setView('products')}
          >
            <span className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Browse All Products
            </span>
            <span className="flex items-center text-muted-foreground">
              {stats?.totalProducts ?? 0}
              <ArrowRight className="h-4 w-4 ml-2" />
            </span>
          </Button>

          {/* Recent Products Table */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 pt-3 sm:pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Products</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setView('products')} className="h-9 hidden sm:flex">
                  View All
                  <Search className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
              {isLoadingRecent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recentProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recent products
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  {/* Mobile-friendly table layout */}
                  <div className="min-w-[600px] sm:min-w-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">SR</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">ND Number</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">Barcode</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden lg:table-cell">Brand</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentProducts.map((product) => (
                          <tr
                            key={product.id}
                            className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              const { setCurrentProduct } = useInventoryStore.getState();
                              setCurrentProduct(product);
                              setView('product-detail');
                            }}
                          >
                            <td className="py-2.5 px-3 font-mono text-xs">{product.sourceRow ?? '-'}</td>
                            <td className="py-2.5 px-3 font-mono text-xs">{product.ndNumber ?? '-'}</td>
                            <td className="py-2.5 px-3 font-mono text-xs hidden sm:table-cell">{product.barcode ?? '-'}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-truncate max-w-[150px] sm:max-w-[200px] block">{product.nameEn ?? '-'}</span>
                            </td>
                            <td className="py-2.5 px-3 text-truncate max-w-[120px] hidden md:table-cell">{product.productType ?? '-'}</td>
                            <td className="py-2.5 px-3 text-truncate max-w-[100px] hidden lg:table-cell">{product.brand ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Progress Dialog — shown when exporting with images OR resuming */}
      <ExportProgressDialog
        open={showProgressDialog}
        exportParams={progressExportParams}
        resumeJobId={resumeJobId}
        filename={progressFilename}
        onClose={() => {
          setShowProgressDialog(false);
          setIsExporting(false);
          setResumeJobId(null);
          setProgressExportParams(null);
        }}
        onComplete={() => {
          setShowProgressDialog(false);
          setIsExporting(false);
          setResumeJobId(null);
          setProgressExportParams(null);
          toast.success('Export completed successfully');
          // Refresh history now that a new export is done.
          loadRecentExports();
        }}
      />
    </div>
  );
}