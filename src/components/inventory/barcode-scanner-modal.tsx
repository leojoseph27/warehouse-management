'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Flashlight, FlashlightOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

/**
 * Full-screen barcode scanner component optimized for mobile.
 * Opens the device camera, scans barcodes, and calls onScan with the result.
 * 
 * CRITICAL FIX: All async operations check for unmounted state before:
 * - Calling setState
 * - Calling onScan/onClose callbacks
 * - Preventing crashes when user cancels/back navigation
 */
export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const hasScannedRef = useRef(false);
  
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Stable callback refs to prevent dependency issues
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  
  // Update refs when props change (without triggering re-renders)
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  // Start scanner on mount
  useEffect(() => {
    isMountedRef.current = true;
    hasScannedRef.current = false;
    let cancelled = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // Check if component is still mounted after dynamic import
        if (cancelled || !scannerRef.current || !isMountedRef.current) {
          console.log('[Scanner] Component unmounted during import, aborting');
          return;
        }

        const scannerId = 'barcode-scanner-element';
        scannerRef.current.id = scannerId;

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            // Prevent duplicate scans
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            
            // Only call callback if still mounted
            if (isMountedRef.current) {
              console.log('[Scanner] Barcode detected:', decodedText);
              onScanRef.current(decodedText);
            } else {
              console.log('[Scanner] Component unmounted, skipping onScan callback');
            }
          },
          () => {} // Ignore scan errors - they're normal during scanning
        );

        // Check mount status before state updates
        if (!cancelled && isMountedRef.current) {
          setIsStarting(false);

          try {
            const track = html5QrCode.getRunningTrackCameraCapabilities?.();
            if (track?.torchFeature?.() && isMountedRef.current) {
              setTorchSupported(true);
            }
          } catch {}
        }
      } catch (err: any) {
        // Check mount before error handling
        if (!cancelled && isMountedRef.current) {
          console.error('[Scanner] Initialization error:', err);
          const errStr = err?.toString?.() || '';
          if (errStr.includes('Permission') || errStr.includes('NotAllowed')) {
            setError('Camera permission denied. Please allow camera access.');
          } else if (errStr.includes('NotFound')) {
            setError('No camera found. Please connect a camera.');
          } else if (errStr.includes('Already started')) {
            setError('Camera is already in use by another application.');
          } else {
            setError(`Could not start camera: ${err?.message || 'Unknown error'}`);
          }
          setIsStarting(false);
        }
      }
    };

    startScanner();

    return () => {
      // Mark as unmounted FIRST to prevent any async callbacks
      isMountedRef.current = false;
      hasScannedRef.current = true; // Prevent any pending onScan calls
      cancelled = true;
      
      // Clean up scanner
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            if (html5QrCodeRef.current) {
              html5QrCodeRef.current.clear();
            }
          })
          .catch(() => {
            // Silently ignore cleanup errors
          });
      }
    };
  }, []); // Empty deps - using refs for callbacks

  // Toggle flashlight/torch with mount check
  const toggleTorch = useCallback(async () => {
    if (!html5QrCodeRef.current || !isMountedRef.current) return;
    try {
      const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities?.();
      if (capabilities?.torchFeature?.()) {
        const newState = !torchOn;
        await capabilities.torch(newState);
        if (isMountedRef.current) {
          setTorchOn(newState);
        }
      }
    } catch (err) {
      console.log('[Scanner] Torch toggle error (ignored):', err);
    }
  }, [torchOn]);

  // Handle close with proper cleanup
  const handleClose = useCallback(() => {
    // Prevent further scans
    hasScannedRef.current = true;
    onCloseRef.current();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col safe-area-inset">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 bg-black/80 text-white z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-11 sm:h-12 px-2 sm:px-3 text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="ml-1 text-sm sm:text-base">Back</span>
        </Button>
        <h2 className="text-base sm:text-lg font-semibold">Scan Barcode</h2>
        <div className="w-10 sm:w-12" />
      </div>

      {/* Scanner viewport */}
      <div className="flex-1 relative flex items-center justify-center">
        <div
          ref={scannerRef}
          className="w-full h-full"
          style={{ minHeight: '300px' }}
        />

        {/* Scanning overlay */}
        {!error && !isStarting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[260px] sm:w-[280px] h-[140px] sm:h-[160px]">
              <div className="absolute top-0 left-0 w-8 sm:w-10 h-8 sm:h-10 border-t-3 sm:border-t-4 border-l-3 sm:border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 sm:w-10 h-8 sm:h-10 border-t-3 sm:border-t-4 border-r-3 sm:border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 sm:w-10 h-8 sm:h-10 border-b-3 sm:border-b-4 border-l-3 sm:border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 sm:w-10 h-8 sm:h-10 border-b-3 sm:border-b-4 border-r-3 sm:border-r-4 border-white rounded-br-lg" />
              <div className="absolute top-1/2 left-3 sm:left-4 right-3 sm:right-4 h-0.5 sm:h-1 bg-red-500/70" />
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isStarting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <div className="h-10 sm:h-12 w-10 sm:w-12 border-3 sm:border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm sm:text-base">Starting camera...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6">
            <div className="text-red-400 text-center mb-6 max-w-sm">
              <p className="text-base sm:text-lg font-medium mb-2">Camera Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={handleClose}
              className="h-11 sm:h-12 px-4 text-white border-white/30 hover:bg-white/10"
            >
              Go Back
            </Button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 px-3 sm:px-4 py-4 sm:py-6 bg-black/80">
        {torchSupported && !error && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTorch}
            className={`h-11 sm:h-12 px-4 sm:px-6 gap-2 ${
              torchOn
                ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400'
                : 'text-white border-white/30 hover:bg-white/10'
            }`}
          >
            {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
            <span className="text-sm">{torchOn ? 'Flash Off' : 'Flash On'}</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleClose}
          className="h-11 sm:h-12 px-4 sm:px-6 text-white border-white/30 hover:bg-white/10"
        >
          Type Manually
        </Button>
      </div>

      {/* Instructions */}
      <div className="text-center pb-4 sm:pb-6 px-4 bg-black/80">
        <p className="text-white/70 text-xs sm:text-sm">
          Point your camera at a barcode. Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39
        </p>
      </div>
    </div>
  );
}