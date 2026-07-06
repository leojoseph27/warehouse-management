'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  Flashlight,
  FlashlightOff,
  ZoomIn,
  ZoomOut,
  Keyboard,
  Check,
  Loader2,
  X,
} from 'lucide-react';

interface ScannerProProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

// Discrete zoom levels for the buttons
const ZOOM_LEVELS = [1, 2, 3, 4, 5];

/**
 * Scanner Pro — Continuous Barcode Scanner with Zoom
 * 
 * This is NOT a photo capture scanner. It uses html5-qrcode for continuous
 * live scanning at 15 fps. The camera stays on and decodes barcodes in real-time.
 * Zoom is applied via MediaStreamTrack.applyConstraints() to the camera hardware.
 */
export function BarcodeScanner({ onScan, onClose }: ScannerProProps) {
  // ── Refs ──
  const scannerRef = useRef<HTMLDivElement>(null);   // div where camera renders
  const html5QrCodeRef = useRef<any>(null);          // the html5-qrcode instance
  const trackRef = useRef<MediaStreamTrack | null>(null); // raw camera track for zoom
  const hasScannedRef = useRef(false);               // prevents double-trigger

  // ── State ──
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Torch state
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  
  // Zoom state
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(5);
  const [zoomIndex, setZoomIndex] = useState(0);
  
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  // ── Start the camera (the "Scan engine") ──
  useEffect(() => {
    let cancelled = false;
    hasScannedRef.current = false;

    const startScanner = async () => {
      try {
        // Dynamic import — avoids SSR issues in Next.js
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled || !scannerRef.current) return;

        // The library needs the div to have an ID
        const scannerId = 'scanner-pro-element';
        scannerRef.current.id = scannerId;

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        console.log('[ScannerPro] Starting camera...');

        await html5QrCode.start(
          { facingMode: 'environment' },          // rear camera
          {
            fps: 15,                              // scan 15 frames per second
            qrbox: { width: 280, height: 160 },   // scan region - wider for barcodes
            aspectRatio: 1.0,
          },
          (decodedText: string) => {              // success callback
            if (!hasScannedRef.current) {
              hasScannedRef.current = true;
              console.log('[ScannerPro] ✅ Barcode detected:', decodedText);
              onScan(decodedText);                // trigger search immediately
            }
          },
          () => { 
            // failure callback — do nothing, keep scanning
            // This is normal when no barcode is in view
          }
        );

        if (cancelled) {
          // If cancelled during start, stop immediately
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
          return;
        }

        setIsStarting(false);
        console.log('[ScannerPro] Camera started successfully');

        // ── Detect zoom support (after camera is running) ──
        try {
          const videoEl = document.querySelector('#scanner-pro-element video') as HTMLVideoElement;
          if (videoEl && videoEl.srcObject) {
            const stream = videoEl.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (track) {
              trackRef.current = track;
              const capabilities = track.getCapabilities?.() as any;
              if (capabilities?.zoom) {
                setZoomSupported(true);
                setZoomMin(capabilities.zoom.min ?? 1);
                setZoomMax(capabilities.zoom.max ?? 5);
                setZoomIndex(0);  // start at 1x
                console.log('[ScannerPro] Zoom supported:', capabilities.zoom);
              }
            }
          }
        } catch (zoomErr) {
          // zoom not supported on this device
          console.log('[ScannerPro] Zoom not supported:', zoomErr);
        }

        // ── Torch detection using html5-qrcode API ──
        try {
          const capabilities = html5QrCode.getRunningTrackCameraCapabilities?.();
          if (capabilities?.torchFeature?.()) {
            setTorchSupported(true);
            console.log('[ScannerPro] Torch supported');
          }
        } catch {
          // torch not supported
        }

      } catch (err: any) {
        if (!cancelled) {
          console.error('[ScannerPro] ❌ Error:', err);
          const errStr = err?.toString?.() || '';
          if (errStr.includes('Permission') || errStr.includes('NotAllowed')) {
            setError('Camera permission denied. Please allow camera access.');
          } else if (errStr.includes('NotFound')) {
            setError('No camera found on this device.');
          } else if (errStr.includes('Already')) {
            setError('Camera is already in use. Close other camera apps.');
          } else {
            setError(`Camera error: ${err?.message || 'Unknown error'}`);
          }
          setIsStarting(false);
        }
      }
    };

    startScanner();

    // ── Cleanup on unmount ──
    return () => {
      cancelled = true;
      hasScannedRef.current = true;
      
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
            console.log('[ScannerPro] Camera stopped and cleared');
          })
          .catch(() => {});
      }
    };
  }, [onScan]);

  // ── Apply zoom to the camera track ──
  const applyZoom = useCallback(async (newZoomIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, newZoomIndex));
    const targetZoom = ZOOM_LEVELS[clampedIndex];
    // Clamp to device-supported range
    const safeZoom = Math.max(zoomMin, Math.min(zoomMax, targetZoom));

    if (trackRef.current && zoomSupported) {
      try {
        await trackRef.current.applyConstraints({
          advanced: [{ zoom: safeZoom }],
        } as any);
        setZoomIndex(clampedIndex);
        console.log('[ScannerPro] Zoom applied:', safeZoom);
      } catch (err) {
        console.warn('[ScannerPro] Zoom apply failed:', err);
      }
    }
  }, [zoomSupported, zoomMin, zoomMax]);

  const zoomIn = useCallback(() => applyZoom(zoomIndex + 1), [zoomIndex, applyZoom]);
  const zoomOut = useCallback(() => applyZoom(zoomIndex - 1), [zoomIndex, applyZoom]);

  // ── Torch toggle (uses html5-qrcode's built-in API) ──
  const toggleTorch = useCallback(async () => {
    if (!html5QrCodeRef.current) return;
    
    try {
      const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities?.();
      if (capabilities?.torchFeature?.()) {
        const torchCap = capabilities.torchFeature();
        if (torchCap.isSupported?.()) {
          const newState = !torchOn;
          await torchCap.apply?.(newState);
          setTorchOn(newState);
          console.log('[ScannerPro] Torch:', newState ? 'ON' : 'OFF');
        }
      }
    } catch (err) {
      console.warn('[ScannerPro] Torch toggle failed:', err);
    }
  }, [torchOn]);

  // Manual barcode submission
  const handleManualSubmit = useCallback(() => {
    if (manualBarcode.trim()) {
      hasScannedRef.current = true;
      onScan(manualBarcode.trim());
    }
  }, [manualBarcode, onScan]);

  // Handle close
  const handleClose = useCallback(() => {
    hasScannedRef.current = true;
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-10 px-2 text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="ml-1 text-sm font-medium">Back</span>
        </Button>
        <h2 className="text-lg font-semibold">Scanner Pro</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="h-10 px-2 text-white hover:bg-white/20"
        >
          <Keyboard className="h-5 w-5" />
        </Button>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 relative">
        <div ref={scannerRef} className="w-full h-full" style={{ minHeight: '300px' }} />

        {/* Corner markers overlay - only show when camera is running */}
        {!error && !isStarting && !showManualEntry && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[280px] h-[160px]">
              {/* Top-left corner */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              {/* Top-right corner */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              {/* Bottom-left corner */}
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              {/* Bottom-right corner */}
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
              {/* Scan line */}
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-red-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isStarting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
            <p className="text-white text-lg font-medium">Starting camera...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6">
            <div className="text-red-400 text-center mb-6 max-w-sm">
              <p className="text-lg font-medium mb-2">Camera Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="h-11 px-6 text-white border-white/30 hover:bg-white/10"
              >
                Go Back
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowManualEntry(true)}
                className="h-11 px-6 text-white border-white/30 hover:bg-white/10"
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Enter Manually
              </Button>
            </div>
          </div>
        )}

        {/* Manual entry overlay */}
        {showManualEntry && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6">
            <div className="w-full max-w-sm space-y-4">
              <p className="text-white text-center text-lg font-medium mb-4">Enter Barcode</p>
              <Input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Type barcode number..."
                className="h-12 text-lg bg-white/10 border-white/30 text-white placeholder:text-white/50"
                autoFocus
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowManualEntry(false)}
                  className="flex-1 h-11 text-white border-white/30 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualSubmit}
                  disabled={!manualBarcode.trim()}
                  className="flex-1 h-11 bg-white text-black hover:bg-white/90 disabled:opacity-50"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black/80 px-4 py-4">
        {/* Zoom controls — only render if zoomSupported */}
        {zoomSupported && !error && !isStarting && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={zoomIndex === 0}
              className="h-10 w-10 text-white hover:bg-white/20 disabled:opacity-40"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            
            {ZOOM_LEVELS.map((level, idx) => (
              <button
                key={level}
                onClick={() => applyZoom(idx)}
                className={`h-10 w-10 rounded-md text-sm font-medium transition-colors ${
                  idx === zoomIndex
                    ? 'bg-white text-black'
                    : 'text-white bg-white/10 hover:bg-white/20'
                }`}
              >
                {level}x
              </button>
            ))}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="h-10 w-10 text-white hover:bg-white/20 disabled:opacity-40"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>
        )}

        {!zoomSupported && !error && !isStarting && (
          <p className="text-white/50 text-xs text-center mb-3">Zoom not supported on this device</p>
        )}

        {/* Torch and Manual buttons */}
        <div className="flex items-center justify-center gap-3">
          {torchSupported && !error && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTorch}
              className={`h-11 px-5 gap-2 ${
                torchOn
                  ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400'
                  : 'text-white border-white/30 hover:bg-white/10'
              }`}
            >
              {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
              <span className="text-sm">{torchOn ? 'Flash Off' : 'Flash On'}</span>
            </Button>
          )}

          {!error && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualEntry(true)}
              className="h-11 px-5 gap-2 text-white border-white/30 hover:bg-white/10"
            >
              <Keyboard className="h-5 w-5" />
              <span className="text-sm">Manual</span>
            </Button>
          )}
        </div>

        {/* Instructions */}
        <p className="text-white/70 text-xs text-center mt-3">
          Point camera at barcode. Supports: EAN-13, EAN-8, UPC-A, Code 128, QR
        </p>
      </div>
    </div>
  );
}