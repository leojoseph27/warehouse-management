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
} from 'lucide-react';

interface ScannerProProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

// Discrete zoom levels for the buttons
const ZOOM_LEVELS = [1, 2, 3, 4, 5];

// Supported barcode formats
const BARCODE_FORMATS = [
  'EAN_13',
  'EAN_8',
  'CODE_128',
  'CODE_39',
  'UPC_A',
  'UPC_E',
  'ITF',
  'QR_CODE',
];

/**
 * Scanner Pro — Full Replication of the Original Pro Scanner
 * 
 * Key features:
 * - Continuous barcode detection using html5-qrcode
 * - Uses native browser BarcodeDetector API when available (faster)
 * - Discrete zoom levels: 1x, 2x, 3x, 4x, 5x buttons
 * - Torch toggle
 * - Manual barcode entry fallback
 */
export function BarcodeScanner({ onScan, onClose }: ScannerProProps) {
  // ── Refs ──
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const isMountedRef = useRef(true);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  
  // ── State ──
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState(''); // Debug status
  
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
  
  // Update refs when props change
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  // ── Start the camera (the "Scan engine") ──
  useEffect(() => {
    isMountedRef.current = true;
    hasScannedRef.current = false;
    let cancelled = false;
    let scanAttempts = 0;

    const startScanner = async () => {
      try {
        // Dynamic import — avoids SSR issues
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        
        if (cancelled || !scannerRef.current || !isMountedRef.current) {
          console.log('[ScannerPro] Component unmounted during import');
          return;
        }

        const scannerId = 'scanner-pro-element';
        scannerRef.current.id = scannerId;

        // Configure barcode formats to support
        const formatsToSupport: any[] = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        const html5QrCode = new Html5Qrcode(scannerId, {
          verbose: false, // Set to true for debugging
          formatsToSupport,
        });
        html5QrCodeRef.current = html5QrCode;

        setScanStatus('Starting camera...');

        // CRITICAL: Use native BarcodeDetector if browser supports it (much faster)
        const config = {
          fps: 10,                    // 10 fps is sufficient, higher can cause issues
          qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
            // Dynamic qrbox - wider for horizontal barcodes
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7);
            // Make it wider for barcodes (width > height)
            return {
              width: qrboxSize,
              height: Math.floor(qrboxSize * 0.5), // Half height for horizontal barcodes
            };
          },
          aspectRatio: 1.777778,      // 16:9 aspect ratio (standard mobile)
          useBarCodeDetectorIfSupported: true, // Use native API if available
          tryHarder: true,            // More thorough scanning
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string, decodedResult: any) => {
            // Success callback
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            
            console.log('[ScannerPro] ✅ Barcode detected:', decodedText, decodedResult);
            
            if (isMountedRef.current) {
              setScanStatus(`Detected: ${decodedText}`);
              // Small delay to show the detected barcode
              setTimeout(() => {
                if (isMountedRef.current) {
                  onScanRef.current(decodedText);
                }
              }, 200);
            }
          },
          (errorMessage: string) => {
            // Scan error callback - this is NORMAL, just keep scanning
            scanAttempts++;
            if (scanAttempts % 30 === 0) {
              console.log('[ScannerPro] Scanning...', scanAttempts, 'attempts');
            }
            // Don't show error to user - this is normal "no barcode found" feedback
          }
        );

        if (!cancelled && isMountedRef.current) {
          setIsStarting(false);
          setScanStatus('Scanning... Point camera at barcode');
          console.log('[ScannerPro] Camera started successfully');
          
          // Detect zoom support
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
                  setZoomIndex(0);
                  console.log('[ScannerPro] Zoom supported:', capabilities.zoom);
                }
              }
            }
          } catch (zoomErr) {
            console.log('[ScannerPro] Zoom detection skipped:', zoomErr);
          }

          // Torch detection
          try {
            const capabilities = html5QrCode.getRunningTrackCameraCapabilities?.();
            if (capabilities?.torchFeature?.()) {
              setTorchSupported(true);
              console.log('[ScannerPro] Torch supported');
            }
          } catch {}
        }
      } catch (err: any) {
        if (!cancelled && isMountedRef.current) {
          console.error('[ScannerPro] ❌ Initialization error:', err);
          const errStr = err?.toString?.() || '';
          if (errStr.includes('Permission') || errStr.includes('NotAllowed')) {
            setError('Camera permission denied. Please allow camera access and refresh.');
          } else if (errStr.includes('NotFound')) {
            setError('No camera found on this device.');
          } else if (errStr.includes('Already started')) {
            setError('Camera is already in use. Close other camera apps.');
          } else {
            setError(`Camera error: ${err?.message || 'Unknown error'}`);
          }
          setIsStarting(false);
        }
      }
    };

    startScanner();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      hasScannedRef.current = true;
      cancelled = true;
      
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
  }, []);

  // Apply zoom
  const applyZoom = useCallback(async (newZoomIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, newZoomIndex));
    const targetZoom = ZOOM_LEVELS[clampedIndex];
    const safeZoom = Math.max(zoomMin, Math.min(zoomMax, targetZoom));

    if (trackRef.current && zoomSupported && isMountedRef.current) {
      try {
        await trackRef.current.applyConstraints({
          advanced: [{ zoom: safeZoom }],
        } as any);
        setZoomIndex(clampedIndex);
        console.log('[ScannerPro] Zoom applied:', safeZoom);
      } catch (err) {
        console.warn('[ScannerPro] Zoom failed:', err);
      }
    }
  }, [zoomSupported, zoomMin, zoomMax]);

  const zoomIn = useCallback(() => applyZoom(zoomIndex + 1), [zoomIndex, applyZoom]);
  const zoomOut = useCallback(() => applyZoom(zoomIndex - 1), [zoomIndex, applyZoom]);

  // Torch toggle
  const toggleTorch = useCallback(async () => {
    if (!html5QrCodeRef.current || !isMountedRef.current) return;
    
    try {
      const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities?.();
      if (capabilities?.torchFeature?.()) {
        const torchCap = capabilities.torchFeature();
        if (torchCap.isSupported?.()) {
          const newState = !torchOn;
          await torchCap.apply?.(newState);
          if (isMountedRef.current) {
            setTorchOn(newState);
          }
        }
      }
    } catch (err) {
      console.log('[ScannerPro] Torch toggle failed:', err);
    }
  }, [torchOn]);

  // Manual barcode submission
  const handleManualSubmit = useCallback(() => {
    if (manualBarcode.trim()) {
      hasScannedRef.current = true;
      onScanRef.current(manualBarcode.trim());
    }
  }, [manualBarcode]);

  // Handle close
  const handleClose = useCallback(() => {
    hasScannedRef.current = true;
    onCloseRef.current();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col safe-area-inset modal-overlay-ios-fix">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white border-b border-white/10">
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
      <div className="flex-1 relative overflow-hidden">
        <div ref={scannerRef} className="w-full h-full" style={{ minHeight: '300px' }} />

        {/* Corner markers overlay */}
        {!error && !isStarting && !showManualEntry && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[280px] sm:w-[300px] h-[120px] sm:h-[130px]">
              <div className="absolute top-0 left-0 w-10 sm:w-12 h-10 sm:h-12 border-t-[3px] sm:border-t-4 border-l-[3px] sm:border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-10 sm:w-12 h-10 sm:h-12 border-t-[3px] sm:border-t-4 border-r-[3px] sm:border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-10 sm:w-12 h-10 sm:h-12 border-b-[3px] sm:border-b-4 border-l-[3px] sm:border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-10 sm:w-12 h-10 sm:h-12 border-b-[3px] sm:border-b-4 border-r-[3px] sm:border-r-4 border-white rounded-br-lg" />
              <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-red-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isStarting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
            <p className="text-white text-base font-medium">Starting camera...</p>
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
      <div className="bg-black/80 border-t border-white/10">
        {/* Zoom controls */}
        {zoomSupported && !error && !isStarting && (
          <div className="flex items-center justify-center gap-2 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={zoomIndex === 0}
              className="h-9 w-9 text-white hover:bg-white/20 disabled:opacity-40"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            
            {ZOOM_LEVELS.map((level, idx) => (
              <button
                key={level}
                onClick={() => applyZoom(idx)}
                className={`h-9 w-9 rounded-md text-sm font-medium transition-colors ${
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
              className="h-9 w-9 text-white hover:bg-white/20 disabled:opacity-40"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>
        )}

        {!zoomSupported && !error && !isStarting && (
          <div className="text-center py-2">
            <p className="text-white/50 text-xs">Zoom not supported on this device</p>
          </div>
        )}

        {/* Torch and Manual buttons */}
        <div className="flex items-center justify-center gap-3 px-4 py-3">
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
        <div className="text-center pb-3 px-4">
          <p className="text-white/70 text-xs sm:text-sm">
            Point camera at barcode. Supports: EAN-13, EAN-8, UPC-A, Code 128, Code 39, QR
          </p>
        </div>
      </div>
    </div>
  );
}