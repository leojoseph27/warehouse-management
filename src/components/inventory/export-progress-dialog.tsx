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
  estimatedTimeRemaining: string;
  error: string | null;
  done: boolean;
}

const INITIAL_STATE: ExportProgressState = {
  stage: 'Preparing export...',
  percentage: 0,
  totalProducts: 0,
  processedProducts: 0,
  totalImages: 0,
  downloadedImages: 0,
  estimatedTimeRemaining: 'Calculating...',
  error: null,
  done: false,
};

interface ExportProgressDialogProps {
  open: boolean;
  exportUrl: string;
  filename: string;
  onClose: () => void;
  onComplete: () => void;
}

export function ExportProgressDialog({
  open,
  exportUrl,
  filename,
  onClose,
  onComplete,
}: ExportProgressDialogProps) {
  const [state, setState] = useState<ExportProgressState>(INITIAL_STATE);
  const [isCancelled, setIsCancelled] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setState(INITIAL_STATE);
      setIsCancelled(false);
      startTimeRef.current = Date.now();
    }
  }, [open]);

  // Start the export with progress tracking
  const startExport = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(exportUrl, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.details || `HTTP ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let textBuffer = '';
      let binaryMode = false;
      let binaryChunks: Uint8Array[] = [];
      let binaryOffset = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (isCancelled) {
          controller.abort();
          break;
        }

        if (binaryMode) {
          // Collect binary data
          binaryChunks.push(value);
          continue;
        }

        // Parse SSE events from text
        textBuffer += decoder.decode(value, { stream: true });

        // Check for binary start marker
        const binaryMarker = 'data: [BINARY_START]\n\n';
        const binaryIdx = textBuffer.indexOf(binaryMarker);
        if (binaryIdx >= 0) {
          // Everything before the marker is SSE text
          const sseText = textBuffer.substring(0, binaryIdx);
          // Process any remaining SSE events
          processSSEEvents(sseText);

          // Switch to binary mode
          binaryMode = true;
          // The marker itself might span across chunks — the remaining bytes
          // after the marker in the current `value` are binary
          // But since we decoded as text, we need to handle this carefully.
          // Actually, the marker is text, and everything after it is binary.
          // The binary data starts fresh from the next chunk.
          textBuffer = '';
          continue;
        }

        // Process SSE events
        const events = textBuffer.split('\n\n');
        textBuffer = events.pop() || '';

        for (const eventStr of events) {
          processSSEEvent(eventStr);
        }
      }

      // Process any remaining text
      if (textBuffer && !binaryMode) {
        const events = textBuffer.split('\n\n');
        for (const eventStr of events) {
          processSSEEvent(eventStr);
        }
      }

      // If we collected binary data, trigger download
      if (binaryChunks.length > 0) {
        const blob = new Blob(binaryChunks as BlobPart[], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      // If not already marked as done by SSE, mark it
      setState(prev => {
        if (prev.done) return prev;
        return { ...prev, done: true, stage: 'Completed', percentage: 100, estimatedTimeRemaining: '00:00' };
      });
    } catch (err: any) {
      if (err.name === 'AbortError' || isCancelled) {
        setState(prev => ({ ...prev, stage: 'Cancelled', error: 'Export cancelled by user' }));
      } else {
        setState(prev => ({ ...prev, error: err.message || 'Export failed', stage: 'Failed' }));
      }
    }
  }, [exportUrl, filename, isCancelled]);

  // Helper: process SSE events from a text block
  function processSSEEvents(text: string) {
    const events = text.split('\n\n');
    for (const eventStr of events) {
      processSSEEvent(eventStr);
    }
  }

  // Helper: process a single SSE event
  function processSSEEvent(eventStr: string) {
    if (!eventStr.startsWith('data: ')) return;
    const jsonStr = eventStr.slice(6).trim();
    if (jsonStr === '[DONE]') {
      setState(prev => ({ ...prev, done: true, stage: 'Completed', percentage: 100 }));
      return;
    }
    if (jsonStr === '[BINARY_START]') return; // handled by binary mode switch
    try {
      const progress = JSON.parse(jsonStr);
      let eta = 'Calculating...';
      if (progress.percentage > 0 && progress.percentage < 100) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const totalEst = elapsed / (progress.percentage / 100);
        const remaining = Math.max(0, totalEst - elapsed);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        eta = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else if (progress.percentage >= 100) {
        eta = '00:00';
      }
      setState(prev => ({
        ...prev,
        ...progress,
        estimatedTimeRemaining: eta,
        error: progress.error || null,
        done: progress.done || false,
      }));
    } catch {
      // Not JSON — ignore
    }
  }

  // Start export when dialog opens
  useEffect(() => {
    if (open && !state.done && !state.error && !isCancelled) {
      const timer = setTimeout(() => startExport(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close after completion
  useEffect(() => {
    if (state.done) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.done, onComplete]);

  const handleCancel = () => {
    setIsCancelled(true);
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, stage: 'Cancelled', error: 'Export cancelled by user' }));
  };

  const handleRetry = () => {
    setState(INITIAL_STATE);
    setIsCancelled(false);
    startTimeRef.current = Date.now();
    setTimeout(() => startExport(), 100);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !state.done) handleCancel(); if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-6" >
        <DialogTitle className="sr-only">Export Progress</DialogTitle>

        {/* Success state */}
        {state.done ? (
          <div className="text-center py-4">
            <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold mb-1">Export Complete</h2>
            <p className="text-sm text-muted-foreground mb-2">Products exported successfully.</p>
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
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
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
            </div>

            <p className="text-[10px] text-muted-foreground mt-4 text-center">
              Please keep this window open. You may continue using other parts of the application.
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
