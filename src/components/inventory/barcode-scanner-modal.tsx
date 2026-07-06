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
  SwitchCamera,
  Keyboard,
  Check,
  Loader2,
} from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

/**
 * Pro Barcode Scanner Component
 * 
 * Features:
 * - Live continuous barcode detection (auto-scan)
 * - Real-time scanning without taking photos
 * - Zoom controls (slider with +/- buttons)
 * - Flash/Torch toggle
 * - Camera switch (front/rear)
 * - Manual barcode entry fallback
 * - Smooth camera preview
 * - Fast detection speed
 * - Proper cleanup on cancel/back
 * 
 * Supports: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, and more
 */
export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const hasScannedRef = useRef(false);
  
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Torch/Flash state
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  
  // Zoom state
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(10);
  const [zoomStep, setZoomStep] = useState(1);
  const [zoomValue, setZoomValue] = useState(1);
  
  // Camera switch state
  const [cameras, setCameras] = useState<Array<{id: string, label: string}>>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [cameraSwitchSupported, setCameraSwitchSupported] = useState(false);
  
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  
  // Stable callback refs to prevent dependency issues
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  
  // Update refs when props change
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  // Get available cameras on mount
  useEffect(() => {
    const getCameras = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0 && isMountedRef.current) {
          setCameras(devices);
          setCameraSwitchSupported(devices.length > 1);
          // Find back camera as default
          const backCameraIndex = devices.findIndex(
            d => d.label.toLowerCase().includes('back') || 
                 d.label.toLowerCase().includes('rear') ||
                 d.label.toLowerCase().includes('environment')
          );
          setCurrentCameraIndex(backCameraIndex >= 0 ? backCameraIndex : 0);
        }
      } catch (err) {
        console.log('[Scanner] Could not enumerate cameras:', err);
      }
    };
    getCameras();
  }, []);

  // Start scanner
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

        // Determine camera to use
        const cameraConfig = cameras.length > 0 
          ? cameras[currentCameraIndex].id 
          : { facingMode: 'environment' };

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 20, // Higher FPS for faster detection
            qrbox: { width: 300, height: 150 }, // Optimized for barcodes
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
            }
          },
          () => {} // Ignore scan errors - normal during scanning
        );

        // Check mount status before state updates
        if (!cancelled && isMountedRef.current) {
          setIsStarting(false);

          // Get camera capabilities
          try {
            const capabilities = html5QrCode.getRunningTrackCameraCapabilities?.();
            
            // Check torch support
            if (capabilities?.torchFeature?.()) {
              const torchCap = capabilities.torchFeature();
              if (torchCap.isSupported?.() && isMountedRef.current) {
                setTorchSupported(true);
              }
            }
            
            // Check zoom support
            if (capabilities?.zoomFeature?.()) {
              const zoomCap = capabilities.zoomFeature();
              if (zoomCap.isSupported?.() && isMountedRef.current) {
                setZoomSupported(true);
                setZoomMin(zoomCap.min?.() || 1);
                setZoomMax(zoomCap.max?.() || 10);
                setZoomStep(zoomCap.step?.() || 1);
                setZoomValue(zoomCap.value?.() || 1);
              }
            }
          } catch (capErr) {
            console.log('[Scanner] Could not get camera capabilities:', capErr);
          }
        }
      } catch (err: any) {
        // Check mount before error handling
        if (!cancelled && isMountedRef.current) {
          console.error('[Scanner] Initialization error:', err);
          const errStr = err?.toString?.() || '';
          if (errStr.includes('Permission') || errStr.includes('NotAllowed')) {
            setError('Camera permission denied. Please allow camera access in your browser settings.');
          } else if (errStr.includes('NotFound')) {
            setError('No camera found. Please connect a camera device.');
          } else if (errStr.includes('Already started')) {
            setError('Camera is already in use by another application.');
          } else {
            setError(`Could not start camera: ${err?.message || 'Unknown error'}`);
          }
          setIsStarting(false);
        }
      }
    };

    // Only start if we have cameras or fallback to facingMode
    if (cameras.length > 0 || cameras.length === 0) {
      startScanner();
    }

    return () => {
      // Mark as unmounted FIRST to prevent any async callbacks
      isMountedRef.current = false;
      hasScannedRef.current = true;
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
  }, [cameras, currentCameraIndex]);

  // Toggle torch/flashlight
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
      console.log('[Scanner] Torch toggle error:', err);
    }
  }, [torchOn]);

  // Apply zoom value
  const applyZoom = useCallback(async (value: number) => {
    if (!html5QrCodeRef.current || !isMountedRef.current || !zoomSupported) return;
    
    const clampedValue = Math.max(zoomMin, Math.min(zoomMax, value));
    
    try {
      const capabilities = html5QrCodeRef.current.getRunningTrackCameraCapabilities?.();
      if (capabilities?.zoomFeature?.()) {
        const zoomCap = capabilities.zoomFeature();
        await zoomCap.apply?.(clampedValue);
        if (isMountedRef.current) {
          setZoomValue(clampedValue);
        }
      }
    } catch (err) {
      console.log('[Scanner] Zoom apply error:', err);
    }
  }, [zoomSupported, zoomMin, zoomMax]);

  // Zoom in
  const zoomIn = useCallback(() => {
    const newValue = Math.min(zoomValue + zoomStep, zoomMax);
    applyZoom(newValue);
  }, [zoomValue, zoomStep, zoomMax, applyZoom]);

  // Zoom out
  const zoomOut = useCallback(() => {
    const newValue = Math.max(zoomValue - zoomStep, zoomMin);
    applyZoom(newValue);
  }, [zoomValue, zoomStep, zoomMin, applyZoom]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!html5QrCodeRef.current || !isMountedRef.current || cameras.length < 2) return;
    
    const newIndex = (currentCameraIndex + 1) % cameras.length;
    
    try {
      // Stop current scanner
      await html5QrCodeRef.current.stop();
      
      // Update camera index
      setCurrentCameraIndex(newIndex);
      
      // Restart with new camera - the useEffect will handle this
    } catch (err) {
      console.log('[Scanner] Camera switch error:', err);
      setError('Could not switch camera. Please try again.');
    }
  }, [currentCameraIndex, cameras]);

  // Handle manual barcode submission
  const handleManualSubmit = useCallback(() => {
    if (manualBarcode.trim()) {
      hasScannedRef.current = true;
      onScanRef.current(manualBarcode.trim());
    }
  }, [manualBarcode]);

  // Handle close with proper cleanup
  const handleClose = useCallback(() => {
    hasScannedRef.current = true;
    onCloseRef.current();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col safe-area-inset">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 bg-black/90 text-white z-10 border-b border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-10 sm:h-11 px-2 sm:px-3 text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="ml-1 text-sm sm:text-base font-medium">Back</span>
        </Button>
        <h2 className="text-base sm:text-lg font-semibold">Pro Scanner</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="h-10 sm:h-11 px-2 sm:px-3 text-white hover:bg-white/20"
        >
          <Keyboard className="h-5 w-5" />
        </Button>
      </div>

      {/* Scanner viewport */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div
          ref={scannerRef}
          className="w-full h-full"
          style={{ minHeight: '300px' }}
        />

        {/* Scanning overlay - Pro style corner brackets */}
        {!error && !isStarting && !showManualEntry && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[280px] sm:w-[300px] h-[140px] sm:h-[150px]">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-10 sm:w-12 h-10 sm:h-12 border-t-[3px] sm:border-t-4 border-l-[3px] sm:border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-10 sm:w-12 h-10 sm:h-12 border-t-[3px] sm:border-t-4 border-r-[3px] sm:border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-10 sm:w-12 h-10 sm:h-12 border-b-[3px] sm:border-b-4 border-l-[3px] sm:border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-10 sm:w-12 h-10 sm:h-12 border-b-[3px] sm:border-b-4 border-r-[3px] sm:border-r-4 border-white rounded-br-lg" />
              {/* Red scan line */}
              <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-red-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isStarting && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
            <p className="text-white text-base font-medium">Starting camera...</p>
            <p className="text-white/70 text-sm mt-2">Please wait</p>
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
                className="h-12 text-lg bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white"
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
      <div className="bg-black/90 border-t border-white/10">
        {/* Zoom slider row */}
        {zoomSupported && !error && !isStarting && (
          <div className="flex items-center justify-center gap-3 px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={zoomValue <= zoomMin}
              className="h-9 w-9 text-white hover:bg-white/20 disabled:opacity-40"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <div className="flex-1 max-w-[200px] flex items-center gap-2">
              <input
                type="range"
                min={zoomMin}
                max={zoomMax}
                step={zoomStep}
                value={zoomValue}
                onChange={(e) => applyZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
              <span className="text-white text-sm w-10">{zoomValue.toFixed(1)}x</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              disabled={zoomValue >= zoomMax}
              className="h-9 w-9 text-white hover:bg-white/20 disabled:opacity-40"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4">
          {/* Torch/Flash button */}
          {torchSupported && !error && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTorch}
              className={`h-11 sm:h-12 px-4 sm:px-5 gap-2 ${
                torchOn
                  ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400'
                  : 'text-white border-white/30 hover:bg-white/10'
              }`}
            >
              {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
              <span className="text-sm hidden sm:inline">{torchOn ? 'Flash Off' : 'Flash On'}</span>
            </Button>
          )}

          {/* Camera switch button */}
          {cameraSwitchSupported && !error && (
            <Button
              variant="outline"
              size="sm"
              onClick={switchCamera}
              className="h-11 sm:h-12 px-4 sm:px-5 gap-2 text-white border-white/30 hover:bg-white/10"
            >
              <SwitchCamera className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Switch</span>
            </Button>
          )}

          {/* Manual entry button */}
          {!error && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualEntry(true)}
              className="h-11 sm:h-12 px-4 sm:px-5 gap-2 text-white border-white/30 hover:bg-white/10"
            >
              <Keyboard className="h-5 w-5" />
              <span className="text-sm hidden sm:inline">Manual</span>
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center pb-3 sm:pb-4 px-4">
          <p className="text-white/70 text-xs sm:text-sm">
            Point camera at barcode. Auto-detects: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR
          </p>
        </div>
      </div>
    </div>
  );
}