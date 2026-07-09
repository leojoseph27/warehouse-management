'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, AlertCircle, X, Download } from 'lucide-react';

interface ExportProgressState {
  stage: string;
  percentage: number;
  totalProducts: number;
  processedProducts: number;
  totalImages: number;
  downloadedImages: number;
  imagesFailed: number;
  productsFailed: number;
  speed: string;
  estimatedTimeRemaining: string;
  error: string | null;
  done: boolean;
  jobId: string | null;
}

const INITIAL_STATE: ExportProgressState = {
  stage: 'Preparing export...',
  percentage: 0,
  totalProducts: 0,
  processedProducts: 0,
  totalImages: 0,
  downloadedImages: 0,
  imagesFailed: 0,
  productsFailed: 0,
  speed: '',
  estimatedTimeRemaining: 'Calculating...',
  error: null,
  done: false,
  jobId: null,
};

interface ExportProgressDialogProps {
  open: boolean;
  /** Parameters for starting the export job */
  exportParams: {
    exportMode: string;
    quality: string;
    srFrom?: number | null;
    srTo?: number | null;
  } | null;
  filename: string;
  onClose: () => void;
  onComplete: () => void;
}

export function ExportProgressDialog({
  open,
  exportParams,
  filename,
  onClose,
  onComplete,
}: ExportProgressDialogProps) {
  const [state, setState] = useState<ExportProgressState>(INITIAL_STATE);
  const [isCancelled, setIsCancelled] = useState(false);
  const startTimeRef = useRef<number>(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setState(INITIAL_STATE);
      setIsCancelled(false);
      startTimeRef.current = Date.now();
      jobIdRef.current = null;
    } else {
      // Cleanup polling when dialog closes
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [open]);

  // Start the export job
  const startExport = useCallback(async () => {
    if (!exportParams) return;

    try {
      // Create the export job
      const res = await fetch('/api/export/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportParams),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const { jobId } = await res.json();
      jobIdRef.current = jobId;
      setState(prev => ({ ...prev, jobId, stage: 'Export job started...' }));

      // Start polling for status
      let lastPercentage = 0;
      let lastUpdateTime = Date.now();

      pollingRef.current = setInterval(async () => {
        if (isCancelled || !jobIdRef.current) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          return;
        }

        try {
          const statusRes = await fetch(`/api/export/${jobIdRef.current}/status`);
          if (!statusRes.ok) return;

          const status = await statusRes.json();

          // Calculate ETA — only after enough data (at least 5% done)
          let eta = 'Calculating...';
          if (status.percentage >= 5 && status.percentage < 100) {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            if (elapsed > 2) {
              const totalEst = elapsed / (status.percentage / 100);
              const remaining = Math.max(0, totalEst - elapsed);
              const mins = Math.floor(remaining / 60);
              const secs = Math.floor(remaining % 60);
              eta = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
          } else if (status.percentage >= 100) {
            eta = '00:00';
          }

          setState(prev => ({
            ...prev,
            stage: status.stage || prev.stage,
            percentage: status.percentage || 0,
            totalProducts: status.totalProducts || 0,
            processedProducts: status.processedProducts || 0,
            totalImages: status.totalImages || 0,
            downloadedImages: status.downloadedImages || 0,
            imagesFailed: (status as any).imagesFailed || 0,
            productsFailed: (status as any).productsFailed || 0,
            speed: (status as any).speed || '',
            estimatedTimeRemaining: eta,
            error: status.errorMessage || null,
            done: status.status === 'completed',
          }));

          // If completed, download the file and stop polling
          if (status.status === 'completed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }

            // Trigger download
            try {
              const dlRes = await fetch(`/api/export/${jobIdRef.current}/download`);
              if (dlRes.ok) {
                const blob = await dlRes.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              }
            } catch (dlErr) {
              console.error('Download failed:', dlErr);
            }
          }

          // If failed, stop polling
          if (status.status === 'failed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setState(prev => ({
              ...prev,
              error: status.errorMessage || 'Export failed',
              stage: 'Failed',
            }));
          }
        } catch (err) {
          // Network error during polling — keep trying
        }
      }, 1500); // Poll every 1.5 seconds
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to start export',
        stage: 'Failed',
      }));
    }
  }, [exportParams, filename, isCancelled]);

  // Start export when dialog opens
  useEffect(() => {
    if (open && !state.jobId && !state.error && !isCancelled) {
      const timer = setTimeout(() => startExport(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close after completion
  useEffect(() => {
    if (state.done) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state.done, onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleCancel = () => {
    setIsCancelled(true);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setState(prev => ({ ...prev, stage: 'Cancelled', error: 'Export cancelled by user' }));
  };

  const handleRetry = () => {
    setState(INITIAL_STATE);
    setIsCancelled(false);
    startTimeRef.current = Date.now();
    jobIdRef.current = null;
    setTimeout(() => startExport(), 100);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !state.done) handleCancel(); if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-6">
        <DialogTitle className="sr-only">Export Progress</DialogTitle>

        {/* Success state */}
        {state.done ? (
          <div className="text-center py-4">
            <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold mb-2">Export Complete</h2>
            <div className="text-sm text-muted-foreground space-y-1 mb-3">
              <p>Products exported: <span className="font-medium text-foreground">{state.totalProducts}</span></p>
              <p>Images exported: <span className="font-medium text-foreground">{state.downloadedImages}</span></p>
              {state.imagesFailed > 0 && (
                <p className="text-red-600">Images failed: {state.imagesFailed}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              <Download className="h-3 w-3 inline mr-1" />
              Download starting...
            </p>
          </div>
        ) : state.error ? (
          /* Error state */
          <div className="text-center py-4">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-lg font-bold mb-1">
              {state.stage === 'Cancelled' ? 'Export Cancelled' : 'Export Failed'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4 break-words px-4">
              {state.error}
            </p>
            <div className="flex gap-2 justify-center">
              {state.stage === 'Cancelled' ? (
                <Button variant="outline" onClick={onClose}>Close</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleRetry}>
                    Retry
                  </Button>
                  <Button variant="ghost" onClick={onClose}>Close</Button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Progress state */
          <div className="py-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 rounded-full p-2 shrink-0">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold">Preparing Export...</h2>
                <p className="text-xs text-muted-foreground">{state.stage}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{state.percentage}%</span>
                <span className="text-muted-foreground">
                  ETA: {state.estimatedTimeRemaining}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${state.percentage}%` }}
                />
              </div>
            </div>

            {/* Detailed counters */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              {state.totalProducts > 0 && (
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-muted-foreground">Products</p>
                  <p className="font-medium">
                    {state.processedProducts} / {state.totalProducts}
                  </p>
                </div>
              )}
              {state.totalImages > 0 && (
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-muted-foreground">Images</p>
                  <p className="font-medium">
                    {state.downloadedImages} / {state.totalImages}
                  </p>
                </div>
              )}
              {state.speed && (
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-muted-foreground">Speed</p>
                  <p className="font-medium">{state.speed}</p>
                </div>
              )}
              {state.imagesFailed > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 rounded-md p-2">
                  <p className="text-muted-foreground">Failed</p>
                  <p className="font-medium text-red-600">{state.imagesFailed} images</p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground mt-4 text-center">
              You may continue using the application while the export runs in the background.
            </p>

            <div className="flex justify-center mt-3">
              <Button variant="outline" size="sm" onClick={handleCancel} className="text-destructive">
                <X className="h-4 w-4 mr-1" />
                Cancel Export
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
