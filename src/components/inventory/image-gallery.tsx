'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Trash2, Star, Image as ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductImage } from '@/store/inventory-store';
import { useUploadStore, UploadItem } from '@/store/upload-store';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: ProductImage[];
  productId: string;
  productName?: string;
  onUpload: (file: File, isPrimary?: boolean) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onSetPrimary: (imageId: string) => Promise<void>;
  onRefreshImages?: () => Promise<void>;
  readOnly?: boolean;
  useBackgroundUpload?: boolean;
  variantId?: string;
}

export function ImageGallery({
  images,
  productId,
  productName,
  onUpload,
  onDelete,
  onSetPrimary,
  onRefreshImages,
  readOnly,
  useBackgroundUpload = false,
  variantId,
}: ImageGalleryProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    addToQueue, 
    getItemsForProduct, 
    removeCompletedForProduct,
    retryUpload,
    removeFromQueue,
    totalUploading,
  } = useUploadStore();
  
  // Get uploads for this product
  const uploadItems = useBackgroundUpload ? getItemsForProduct(productId) : [];
  
  // Separate into pending (uploading/queued) and completed uploads
  const pendingUploads = uploadItems.filter(
    i => i.status === 'queued' || i.status === 'uploading' || i.status === 'processing'
  );
  const failedUploads = uploadItems.filter(i => i.status === 'failed');
  const completedUploads = uploadItems.filter(i => i.status === 'completed');
  
  // Combine existing images with completed uploads (avoid duplicates)
  // This ensures existing images are preserved when new ones are added
  const allImages = [...images];
  
  // Add completed uploads that aren't already in the images array
  for (const upload of completedUploads) {
    if (upload.imageId && !allImages.some(img => img.id === upload.imageId)) {
      allImages.push({
        id: upload.imageId,
        productId: upload.productId,
        imageUrl: upload.imageUrl || '',
        isPrimary: upload.isPrimary,
        displayOrder: allImages.length,
        createdAt: new Date(upload.completedAt || Date.now()).toISOString(),
      });
    }
  }
  
  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Determine if first image (for primary)
    const isFirstImage = allImages.length === 0 && pendingUploads.length === 0;
    
    if (useBackgroundUpload) {
      // Add to background upload queue (sequential FIFO)
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const willBePrimary = isFirstImage && i === 0;
        
        await addToQueue(file, productId, productName, {
          isPrimary: willBePrimary,
          variantId,
        });
      }
      e.target.value = '';
    } else {
      // Direct upload (blocking)
      for (const file of Array.from(files)) {
        await onUpload(file, allImages.length === 0);
      }
      e.target.value = '';
    }
  }, [onUpload, allImages.length, pendingUploads.length, useBackgroundUpload, addToQueue, productId, productName, variantId]);
  
  // Handle delete
  const handleDelete = async (imageId: string) => {
    await onDelete(imageId);
    if (onRefreshImages) {
      await onRefreshImages();
    }
  };
  
  // Handle set primary
  const handleSetPrimary = async (imageId: string) => {
    await onSetPrimary(imageId);
    if (onRefreshImages) {
      await onRefreshImages();
    }
  };
  
  // Clear completed uploads for this product after viewing
  useEffect(() => {
    // Optional: Clear completed uploads when component unmounts
    // This keeps the UI clean while preserving the actual images
  }, [productId]);
  
  // Render upload item card for pending/failed uploads
  const renderUploadCard = (item: UploadItem) => (
    <div 
      key={item.id} 
      className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
    >
      {/* Thumbnail or placeholder */}
      {item.thumbnail ? (
        <img 
          src={item.thumbnail} 
          alt={item.fileName}
          className="w-full h-full object-cover opacity-70"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
        </div>
      )}
      
      {/* Progress overlay */}
      {item.status === 'uploading' && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
          <div className="w-3/4 space-y-2">
            <Progress value={item.progress} className="h-2" />
            <div className="text-white text-xs text-center font-medium">
              {item.progress}%
            </div>
          </div>
        </div>
      )}
      
      {/* Status badge */}
      <div className="absolute top-1 right-1">
        {item.status === 'queued' && (
          <Badge variant="secondary" className="text-xs px-1.5">
            <Loader2 className="h-3 w-3 mr-0.5" />
            #{item.queuePosition}
          </Badge>
        )}
        {item.status === 'uploading' && (
          <Badge className="text-xs px-1.5 bg-blue-500 text-white">
            <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
            Up
          </Badge>
        )}
        {item.status === 'failed' && (
          <Badge variant="destructive" className="text-xs px-1.5">
            Failed
          </Badge>
        )}
      </div>
      
      {/* Failed upload actions */}
      {item.status === 'failed' && !readOnly && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
          {item.retryCount < item.maxRetries && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => retryUpload(item.id)}
              title="Retry upload"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => removeFromQueue(item.id)}
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* File name at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
        <p className="text-white text-xs truncate">{item.fileName}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header row with responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">
            Product Images
          </label>
          {pendingUploads.length > 0 && (
            <Badge className="text-xs bg-blue-500 text-white">
              {pendingUploads.length} uploading
            </Badge>
          )}
          {failedUploads.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {failedUploads.length} failed
            </Badge>
          )}
          {allImages.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {allImages.length} images
            </Badge>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              className="h-11 px-3 flex-1 sm:flex-none"
              disabled={totalUploading > 0}
            >
              <Camera className="h-4 w-4 sm:mr-1" />
              <span className="text-xs sm:text-sm">Photo</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-11 px-3 flex-1 sm:flex-none"
              disabled={totalUploading > 0}
            >
              <Upload className="h-4 w-4 sm:mr-1" />
              <span className="text-xs sm:text-sm">Upload</span>
            </Button>
          </div>
        )}
      </div>
      
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e, true)}
        className="hidden"
        disabled={totalUploading > 0}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e, false)}
        className="hidden"
        disabled={totalUploading > 0}
      />
      
      {/* Combined grid: pending uploads + existing images */}
      {(pendingUploads.length > 0 || failedUploads.length > 0 || allImages.length > 0) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {/* Pending uploads first (show uploading state) */}
          {pendingUploads.sort((a, b) => a.queuePosition - b.queuePosition).map(renderUploadCard)}
          
          {/* Failed uploads (show retry option) */}
          {failedUploads.map(renderUploadCard)}
          
          {/* Existing/completed images */}
          {allImages
            .sort((a, b) => {
              if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
              return a.displayOrder - b.displayOrder;
            })
            .map((image) => (
              <div key={image.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                <img
                  src={image.imageUrl}
                  alt="Product"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setPreviewImage(image.imageUrl)}
                />
                {image.isPrimary && (
                  <div className="absolute top-1 left-1">
                    <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5">
                      <Star className="h-3 w-3 mr-0.5" />
                      Primary
                    </Badge>
                  </div>
                )}
                {!readOnly && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {!image.isPrimary && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => handleSetPrimary(image.id)}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => handleDelete(image.id)}
                      title="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-6 sm:p-8 text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images yet</p>
          {!readOnly && (
            <p className="text-xs mt-1">Take a photo or upload images</p>
          )}
        </div>
      )}
      
      {/* Upload note for background uploads */}
      {useBackgroundUpload && pendingUploads.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>
            Images are uploading in background. You can save product and continue working.
            Uploads will continue automatically.
          </span>
        </div>
      )}
      
      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-sm sm:max-w-lg md:max-w-xl p-2 sm:p-3">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <img src={previewImage} alt="Product preview" className="w-full rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}