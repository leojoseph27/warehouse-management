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
  failedImages: number;
  chunkCount: number;
  currentChunk: number | null;
  speed: string;
  estimatedTimeRemaining: string;
  estimatedSizeBytes: number | null;
  fileSize: number | null;
  blobExpiresAt: string | null;
  error: string | null;
  done: boolean;
  jobId: string | null;
  downloadUrl: string | null;
}

const INITIAL_STATE: ExportProgressState = {
  stage: 'Preparing export...',
  percentage: 0,
  totalProducts: 0,
  processedProducts: 0,
  totalImages: 0,
  downloadedImages: 0,
  failedImages: 0,
  chunkCount: 0,
  currentChunk: null,
  speed: '',
  estimatedTimeRemaining: 'Calculating...',
  estimatedSizeBytes: null,
  fileSize: null,
  blobExpiresAt: null,
  error: null,
  done: false,
  jobId: null,
  downloadUrl: null,
};

interface ExportProgressDialogProps {
  open: boolean;
  /** Parameters for starting a NEW export job. If null and resumeJobId is set, we resume. */
  exportParams: {
    exportMode: string;
    quality: string;
    srFrom?: number | null;
    srTo?: number | null;
  } | null;
  /** Optional existing jobId to resume. When set, exportParams is ignored. */
  resumeJobId?: string | null;
  filename: string;
  onClose: () => void;
  onComplete: () => void;
}

const INTER_CHUNK_DELAY_MS = 300;
const MAX_CONSECUTIVE_ERRORS = 5;

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function ExportProgressDialog({
  open,
  exportParams,
  resumeJobId,
  filename,
  onClose,
  onComplete,
}: ExportProgressDialogProps) {
  const [state, setState] = useState<ExportProgressState>(INITIAL_STATE);
  const [isCancelled, setIsCancelled] = useState(false);
  const startTimeRef = useRef<number>(0);
  const jobIdRef = useRef<string | null>(null);
  const cursorRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);
  const downloadTriggeredRef = useRef<boolean>(false);
  const pollCountRef = useRef<number>(0);
  const completionHandledRef = useRef<boolean>(false);

  // Reset state when dialog opens.
  useEffect(() => {
    if (open) {
      setState(INITIAL_STATE);
      setIsCancelled(false);
      cancelledRef.current = false;
      startTimeRef.current = Date.now();
      jobIdRef.current = resumeJobId || null;
      cursorRef.current = null;
      isProcessingRef.current = false;
      consecutiveErrorsRef.current = 0;
      downloadTriggeredRef.current = false;
      pollCountRef.current = 0;
      completionHandledRef.current = false;
    }
  }, [open, resumeJobId]);

  // ── Download the result file ──
  const downloadResult = useCallback(async (jobId: string) => {
    try {
      const dlRes = await fetch(`/api/export/${jobId}/download`);
      if (dlRes.ok) {
        const blob = await dlRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        console.error('Download failed:', dlRes.status, await dlRes.text().catch(() => ''));
      }
    } catch (dlErr) {
      console.error('Download failed:', dlErr);
    }
  }, [filename]);

  // ── Process ONE chunk ──
  const processOneChunk = useCallback(async (jobId: string): Promise<boolean> => {
    if (cancelledRef.current) return true;

    pollCountRef.current += 1;
    const pollCount = pollCountRef.current;

    console.log(`[export-orchestrator] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[export-orchestrator] POLL #${pollCount} — jobId=${jobId} cursor=${cursorRef.current}`);

    const res = await fetch('/api/export/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, cursor: cursorRef.current }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error(`[export-orchestrator] POLL #${pollCount} FAILED — HTTP ${res.status}`, body);
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    cursorRef.current = data.nextCursor ?? null;

    console.log(`[export-orchestrator] POLL #${pollCount} RESPONSE:`);
    console.log(`  status:              ${data.status}`);
    console.log(`  stage:               ${data.stage}`);
    console.log(`  percentage:          ${data.percentage}%`);
    console.log(`  cursor/nextCursor:   ${data.nextCursor}`);
    console.log(`  processedProducts:   ${data.processedProducts} / ${data.totalProducts}`);
    console.log(`  downloadedImages:    ${data.downloadedImages} / ${data.totalImages}`);
    console.log(`  chunkCount:          ${data.chunkCount}`);
    console.log(`  fileSize:            ${data.fileSize}`);
    console.log(`  downloadUrl:         ${data.downloadUrl}`);
    console.log(`  done:                ${data.done}`);
    if (data.error) {
      console.log(`  error:               ${data.error}`);
    }

    setState(prev => ({
      ...prev,
      jobId,
      stage: data.stage || prev.stage,
      percentage: data.percentage || 0,
      totalProducts: data.totalProducts || 0,
      processedProducts: data.processedProducts || 0,
      totalImages: data.totalImages || 0,
      downloadedImages: data.downloadedImages || 0,
      failedImages: data.failedImages || 0,
      chunkCount: data.chunkCount || 0,
      currentChunk: data.currentChunk ?? null,
      speed: data.speed || '',
      estimatedTimeRemaining: data.eta || 'Calculating...',
      estimatedSizeBytes: data.estimatedSizeBytes ?? null,
      fileSize: data.fileSize ?? null,
      blobExpiresAt: data.blobExpiresAt ?? null,
      downloadUrl: data.downloadUrl ?? null,
      error: data.error || null,
      done: data.done || false,
    }));

    // ── Handle completion: trigger download IMMEDIATELY ──
    if (data.status === 'completed') {
      console.log(`[export-orchestrator] ✓ JOB COMPLETED — triggering download`);
      console.log(`[export-orchestrator]   fileSize:    ${data.fileSize}`);
      console.log(`[export-orchestrator]   downloadUrl: ${data.downloadUrl}`);
      if (!downloadTriggeredRef.current) {
        downloadTriggeredRef.current = true;
        console.log(`[export-orchestrator] Calling downloadResult(${jobId})...`);
        downloadResult(jobId);
      } else {
        console.warn(`[export-orchestrator] Download already triggered — skipping (prevents duplicate)`);
      }
      return true;
    }

    if (['failed', 'cancelled'].includes(data.status)) {
      console.log(`[export-orchestrator] ✗ JOB ${data.status.toUpperCase()} — stopping polling`);
      return true;
    }

    // ── Infinite loop guard: if we've polled >50 times, something is wrong ──
    if (pollCount > 50) {
      console.error(`[export-orchestrator] ✗ POLL LIMIT EXCEEDED (50 polls) — stopping to prevent infinite loop`);
      console.error(`[export-orchestrator]   Final status: ${data.status}`);
      console.error(`[export-orchestrator]   Final stage:  ${data.stage}`);
      setState(prev => ({
        ...prev,
        error: `Export stalled — exceeded 50 polling cycles without completion. Last status: ${data.status}, stage: ${data.stage}`,
        stage: 'Failed',
      }));
      return true;
    }

    return false;
  }, [downloadResult]);

  // ── Main orchestrator loop ──
  const runOrchestrator = useCallback(async (jobId: string) => {
    while (!cancelledRef.current && !completionHandledRef.current) {
      if (isProcessingRef.current) {
        await new Promise(r => setTimeout(r, 100));
        continue;
      }
      isProcessingRef.current = true;

      try {
        const done = await processOneChunk(jobId);
        consecutiveErrorsRef.current = 0;

        if (done || completionHandledRef.current) {
          isProcessingRef.current = false;
          console.log(`[export-orchestrator] Loop exiting — done=${done}, completionHandled=${completionHandledRef.current}`);
          return;
        }
      } catch (err: any) {
        consecutiveErrorsRef.current++;
        console.error(
          `[export-orchestrator] Chunk error #${consecutiveErrorsRef.current}:`,
          err?.message
        );

        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          setState(prev => ({
            ...prev,
            error: `Export failed after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Last error: ${err?.message || 'unknown'}`,
            stage: 'Failed',
          }));
          isProcessingRef.current = false;
          return;
        }

        // Brief backoff before retrying.
        await new Promise(r => setTimeout(r, 1500));
      } finally {
        isProcessingRef.current = false;
      }

      await new Promise(r => setTimeout(r, INTER_CHUNK_DELAY_MS));
    }
    console.log(`[export-orchestrator] Loop exited — cancelled=${cancelledRef.current}, completionHandled=${completionHandledRef.current}`);
  }, [processOneChunk]);

  // ── Kickoff: create the job (or resume), then start orchestrator ──
  const startExport = useCallback(async () => {
    try {
      let jobId: string | null = jobIdRef.current;

      // If we have a resumeJobId, skip creation and go straight to processing.
      if (!jobId) {
        if (!exportParams) return;

        const startRes = await fetch('/api/export/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exportParams),
        });

        if (!startRes.ok) {
          const body = await startRes.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${startRes.status}`);
        }

        const startData = await startRes.json();
        jobId = startData.jobId;
        jobIdRef.current = jobId;
        setState(prev => ({
          ...prev,
          jobId,
          stage: 'Initializing export...',
          percentage: 1,
        }));
      } else {
        // Resuming — fetch current status first so we display accurate state.
        const statusRes = await fetch(`/api/export/${jobId}/status`);
        if (statusRes.ok) {
          const status = await statusRes.json();
          cursorRef.current = status.cursor ?? null;
          setState(prev => ({
            ...prev,
            jobId,
            stage: status.stage || 'Resuming...',
            percentage: status.percentage || 0,
            totalProducts: status.totalProducts || 0,
            processedProducts: status.processedProducts || 0,
            totalImages: status.totalImages || 0,
            downloadedImages: status.downloadedImages || 0,
            failedImages: status.failedImages || 0,
            chunkCount: status.chunkCount || 0,
            estimatedSizeBytes: status.estimatedSizeBytes ?? null,
            fileSize: status.fileSize ?? null,
            blobExpiresAt: status.blobExpiresAt ?? null,
            downloadUrl: status.downloadUrl ?? null,
            done: status.status === 'completed',
            error: status.status === 'failed' ? (status.errorMessage || 'Export failed') : null,
          }));
          // If already terminal, don't start the orchestrator.
          if (['completed', 'failed', 'cancelled'].includes(status.status)) {
            console.log(`[export-orchestrator] Resume: job already ${status.status}`);
            if (status.status === 'completed' && !downloadTriggeredRef.current) {
              downloadTriggeredRef.current = true;
              console.log(`[export-orchestrator] Resume: triggering download for completed job`);
              downloadResult(jobId);
            }
            return;
          }
        }
      }

      // At this point jobId is guaranteed non-null (we either had one or threw above).
      if (!jobId) return;

      console.log(`[export-orchestrator] Starting orchestrator loop for jobId=${jobId}`);
      await runOrchestrator(jobId);

      // Download is now triggered inside processOneChunk when status='completed'.
      // No stale-state download trigger here — that was the old buggy pattern.
      console.log(`[export-orchestrator] Orchestrator loop exited. downloadTriggered=${downloadTriggeredRef.current} cancelled=${cancelledRef.current}`);
    } catch (err: any) {
      console.error(`[export-orchestrator] startExport FAILED:`, err?.message);
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to start export',
        stage: 'Failed',
      }));
    }
  }, [exportParams, runOrchestrator, downloadResult]);

  // Start the export when the dialog opens.
  useEffect(() => {
    if (open && !state.jobId && !state.error && !isCancelled) {
      const timer = setTimeout(() => startExport(), 100);
      return () => clearTimeout(timer);
    }
    // Intentionally only re-run when `open` changes — we don't want to restart
    // the export on every state update.
  }, [open]);

  // Auto-close after completion (give the download a moment to start).
  // GUARDED: only fires once per job via completionHandledRef.
  useEffect(() => {
    if (state.done && !completionHandledRef.current) {
      completionHandledRef.current = true;
      console.log(`[export-orchestrator] ✓ Completion handled — stopping all polling, firing onComplete once`);
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
    // Intentionally only re-run when state.done changes.
  }, [state.done]);

  // ── Cancel handler ──
  const handleCancel = useCallback(async () => {
    if (cancelledRef.current) return;
    cancelledRef.current = true;
    setIsCancelled(true);
    isProcessingRef.current = false;

    if (jobIdRef.current) {
      try {
        await fetch(`/api/export/${jobIdRef.current}/cancel`, { method: 'POST' });
      } catch (err) {
        console.warn('Cancel request failed:', err);
      }
    }

    setState(prev => ({
      ...prev,
      stage: 'Cancelled',
      error: 'Export cancelled by user',
    }));
  }, []);

  const handleRetry = () => {
    setState(INITIAL_STATE);
    setIsCancelled(false);
    cancelledRef.current = false;
    startTimeRef.current = Date.now();
    jobIdRef.current = null;
    cursorRef.current = null;
    isProcessingRef.current = false;
    consecutiveErrorsRef.current = 0;
    downloadTriggeredRef.current = false;
    pollCountRef.current = 0;
    completionHandledRef.current = false;
    setTimeout(() => startExport(), 100);
  };

  // ── Manual re-download button (for completed jobs) ──
  const handleRedownload = useCallback(() => {
    if (state.jobId) {
      downloadResult(state.jobId);
    }
  }, [state.jobId, downloadResult]);

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
              <p>Chunks processed: <span className="font-medium text-foreground">{state.chunkCount}</span></p>
              <p>File size: <span className="font-medium text-foreground">{formatBytes(state.fileSize ?? state.estimatedSizeBytes)}</span></p>
              {state.blobExpiresAt && (
                <p className="text-[10px] text-muted-foreground">
                  Available until {new Date(state.blobExpiresAt).toLocaleString()}
                </p>
              )}
              {state.failedImages > 0 && (
                <p className="text-amber-600">Images failed: {state.failedImages}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              <Download className="h-3 w-3 inline mr-1" />
              Download starting...
            </p>
            <Button variant="outline" size="sm" onClick={handleRedownload}>
              <Download className="h-4 w-4 mr-1" />
              Download again
            </Button>
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
                <h2 className="text-base font-bold">Exporting Products...</h2>
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
              {state.chunkCount > 0 && (
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-muted-foreground">Chunks</p>
                  <p className="font-medium">{state.chunkCount}</p>
                </div>
              )}
              {state.speed && (
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-muted-foreground">Speed</p>
                  <p className="font-medium">{state.speed}</p>
                </div>
              )}
              {state.estimatedSizeBytes != null && state.estimatedSizeBytes > 0 && (
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="text-muted-foreground">Est. size</p>
                  <p className="font-medium">{formatBytes(state.estimatedSizeBytes)}</p>
                </div>
              )}
              {state.failedImages > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-md p-2">
                  <p className="text-muted-foreground">Failed</p>
                  <p className="font-medium text-amber-600">{state.failedImages} images</p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground mt-4 text-center">
              Processing in chunks — you may close this dialog and resume later.
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
