'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Upload,
  Trash2,
  Star,
  Image as ImageIcon,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  Pencil,
  GripVertical,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProductImage } from '@/store/inventory-store';
import { useUploadStore, UploadItem } from '@/store/upload-store';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ImageGalleryProps {
  images: ProductImage[];
  productId: string;
  productName?: string;
  onUpload: (file: File, isPrimary?: boolean) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onSetPrimary: (imageId: string) => Promise<void>;
  onRefreshImages?: () => Promise<void>;
  onReplace?: (imageId: string, file: File) => Promise<void>;
  onReorder?: (orderedImageIds: string[]) => Promise<void>;
  readOnly?: boolean;
  useBackgroundUpload?: boolean;
  variantId?: string;
  maxImages?: number;
  maxFileSizeMB?: number;
}

// ── Validation constants ──
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const DEFAULT_MAX_IMAGES = 10;
const DEFAULT_MAX_FILE_SIZE_MB = 10;

/** Format bytes into a human-readable string */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Status label for an upload item */
function getStatusLabel(status: UploadItem['status']): string {
  switch (status) {
    case 'queued': return 'Preparing...';
    case 'uploading': return 'Uploading...';
    case 'processing': return 'Processing...';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    default: return status;
  }
}

export function ImageGallery({
  images,
  productId,
  productName,
  onUpload,
  onDelete,
  onSetPrimary,
  onRefreshImages,
  onReplace,
  onReorder,
  readOnly,
  useBackgroundUpload = false,
  variantId,
  maxImages = DEFAULT_MAX_IMAGES,
  maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
}: ImageGalleryProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());
  const [isRefreshingGallery, setIsRefreshingGallery] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<ProductImage | null>(null);

  const {
    addToQueue,
    getItemsForProduct,
    removeCompletedForProduct,
    retryUpload,
    removeFromQueue,
    totalUploading,
  } = useUploadStore();

  // Get uploads for this product
  const rawUploadItems = useBackgroundUpload ? getItemsForProduct(productId) : [];
  const uploadItems = Array.isArray(rawUploadItems) ? rawUploadItems : [];

  // Only pending and failed uploads are rendered as progress cards.
  // Completed uploads are NOT rendered here — the real image arrives from
  // the server via onRefreshImages and is rendered as a normal ProductImage.
  // This prevents the "duplicate card" bug where a completed upload appears
  // both as a fake ProductImage AND as a real one from the server.
  const pendingUploads = uploadItems.filter(
    i => i && (i.status === 'queued' || i.status === 'uploading' || i.status === 'processing')
  );
  const failedUploads = uploadItems.filter(i => i && i.status === 'failed');
  const completedUploads = uploadItems.filter(i => i && i.status === 'completed');

  // The gallery renders ONLY real ProductImages from the server.
  // Upload queue items are NEVER mixed into this array.
  const allImages: ProductImage[] = [...(images ?? [])];

  // Track when uploads transition to completed so we can:
  // 1. Fire onRefreshImages immediately (to fetch the real image from server)
  // 2. Show a brief success badge on the newly-arrived image
  useEffect(() => {
    const newlyCompleted = completedUploads.filter(u => !recentlyCompleted.has(u.id));
    if (newlyCompleted.length === 0) return;

    setRecentlyCompleted(prev => {
      const next = new Set(prev);
      newlyCompleted.forEach(u => next.add(u.id));
      return next;
    });

    // IMMEDIATELY refresh images from the server so the real ProductImage
    // appears in the gallery. This replaces the upload progress card with
    // the actual image — no duplicate cards.
    if (onRefreshImages) {
      onRefreshImages();
    }

    // After 1.5 seconds, clean up the completed upload items from the store
    // and remove them from the "recently completed" set. The real image is
    // already in the gallery from the server refresh above.
    const timer = setTimeout(() => {
      setRecentlyCompleted(prev => {
        const next = new Set(prev);
        newlyCompleted.forEach(u => next.delete(u.id));
        return next;
      });
      removeCompletedForProduct(productId);
    }, 1500);

    return () => clearTimeout(timer);
  }, [completedUploads, recentlyCompleted, removeCompletedForProduct, productId, onRefreshImages]);

  // ── Validation ──
  const validateFile = useCallback((file: File, existingImages: ProductImage[]): string | null => {
    // Type check
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return `"${file.name}" is not a supported image type. Use JPG, PNG, WebP, or GIF.`;
    }
    // Size check
    const maxBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `"${file.name}" is ${formatFileSize(file.size)}. Maximum is ${maxFileSizeMB} MB.`;
    }
    // Duplicate filename check
    const duplicateName = [...existingImages, ...uploadItems].some(
      img => 'fileName' in img && (img as any).fileName === file.name
    );
    if (duplicateName) {
      return `"${file.name}" is already in the upload queue.`;
    }
    return null;
  }, [uploadItems, maxFileSizeMB]);

  // ── File selection handler (used by both input and drag-drop) ──
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setValidationError(null);
    const fileArray = Array.from(files);

    // Capacity check
    if (allImages.length + fileArray.length > maxImages) {
      setValidationError(`Cannot upload ${fileArray.length} image(s). Maximum ${maxImages} images per product (currently ${allImages.length}).`);
      return;
    }

    // Validate each file
    for (const file of fileArray) {
      const err = validateFile(file, allImages);
      if (err) {
        setValidationError(err);
        return;
      }
    }

    const isFirstImage = allImages.length === 0 && pendingUploads.length === 0;

    if (useBackgroundUpload) {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const willBePrimary = isFirstImage && i === 0;
        await addToQueue(file, productId, productName, {
          isPrimary: willBePrimary,
          variantId,
        });
      }
    } else {
      for (const file of fileArray) {
        await onUpload(file, allImages.length === 0);
      }
    }
  }, [allImages, pendingUploads.length, useBackgroundUpload, addToQueue, onUpload, productId, productName, variantId, maxImages, validateFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFiles(files);
    e.target.value = '';
  }, [handleFiles]);

  // ── Drag & drop upload ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  }, [isDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (readOnly) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFiles(files);
    }
  }, [handleFiles, readOnly]);

  // ── Delete with confirmation ──
  const handleDeleteClick = (image: ProductImage) => {
    setDeleteTarget(image);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      if (onRefreshImages) await onRefreshImages();
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Set primary ──
  const handleSetPrimary = async (imageId: string) => {
    await onSetPrimary(imageId);
    if (onRefreshImages) await onRefreshImages();
  };

  // ── Replace image ──
  const handleReplaceClick = (image: ProductImage) => {
    replaceTargetRef.current = image;
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = replaceTargetRef.current;
    if (!file || !target) return;

    // Validate the replacement file
    const err = validateFile(file, allImages);
    if (err) {
      setValidationError(err);
      e.target.value = '';
      replaceTargetRef.current = null;
      return;
    }

    if (onReplace) {
      await onReplace(target.id, file);
      if (onRefreshImages) await onRefreshImages();
    }
    e.target.value = '';
    replaceTargetRef.current = null;
  };

  // ── Drag-and-drop reordering (dnd-kit) ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sorted images for display (primary first, then by displayOrder)
  const sortedImages = useMemo(() => {
    return [...allImages].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.displayOrder - b.displayOrder;
    });
  }, [allImages]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedImages.findIndex(img => img.id === active.id);
    const newIndex = sortedImages.findIndex(img => img.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sortedImages, oldIndex, newIndex);
    const orderedIds = newOrder.map(img => img.id);

    if (onReorder) {
      await onReorder(orderedIds);
    }
  };

  // ── Image counter ──
  const primaryCount = allImages.filter(i => i.isPrimary).length;
  const additionalCount = allImages.length - primaryCount;
  const counterText = allImages.length === 0
    ? 'No images'
    : primaryCount > 0
      ? `Primary + ${additionalCount} additional image${additionalCount !== 1 ? 's' : ''}`
      : `${allImages.length} image${allImages.length !== 1 ? 's' : ''}`;

  // Upload is NEVER disabled by ongoing uploads. The user can upload multiple
  // images concurrently — each gets its own queue item and progress card.
  // Only readOnly mode disables the upload button.
  const isUploadDisabled = readOnly;

  // ── Upload card for pending/failed/completed uploads ──
  const renderUploadCard = (item: UploadItem) => {
    const isCompleted = item.status === 'completed';
    const isFailed = item.status === 'failed';
    const showSuccess = isCompleted && recentlyCompleted.has(item.id);

    return (
      <div
        key={item.id}
        className={cn(
          'relative aspect-square rounded-lg overflow-hidden border bg-muted',
          isFailed && 'border-destructive'
        )}
      >
        {/* Thumbnail — fully visible even when completed (no opacity dim) */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.fileName}
            className={cn('w-full h-full object-cover', isFailed && 'opacity-50')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        )}

        {/* Progress overlay (uploading) */}
        {item.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center px-3">
            <div className="w-full space-y-1.5">
              <Progress value={item.progress} className="h-2" />
              <div className="text-white text-xs text-center font-medium">
                {item.progress}%
              </div>
            </div>
          </div>
        )}

        {/* Queued overlay */}
        {item.status === 'queued' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-6 w-6 text-white animate-spin mx-auto mb-1" />
              <p className="text-white text-[10px]">Queued #{item.queuePosition}</p>
            </div>
          </div>
        )}

        {/* Success indicator — small corner badge, does NOT cover the image
            or block any action buttons. Shows for ~1.5s then disappears.
            The image is immediately usable (Set Primary, Preview, Replace,
            Delete) even while this badge is visible. */}
        {showSuccess && (
          <div className="absolute top-1 right-1 z-10 bg-green-600 rounded-full p-0.5 shadow-sm pointer-events-none">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Failed overlay */}
        {isFailed && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2">
            <AlertCircle className="h-6 w-6 text-destructive mb-1" />
            <p className="text-white text-[10px] text-center mb-2 line-clamp-2">
              {item.error || 'Upload failed'}
            </p>
            <div className="flex gap-1">
              {item.retryCount < item.maxRetries && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 px-2 text-[10px]"
                  onClick={() => retryUpload(item.id)}
                  title="Retry upload"
                  aria-label={`Retry upload of ${item.fileName}`}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8 px-2 text-[10px]"
                onClick={() => removeFromQueue(item.id)}
                title="Remove from queue"
                aria-label={`Remove ${item.fileName} from queue`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Filename + size + status at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
          <p className="text-white text-[10px] truncate font-medium">{item.fileName}</p>
          <div className="flex items-center justify-between">
            <p className="text-white/70 text-[9px]">{formatFileSize(item.fileSize)}</p>
            <p className={cn(
              'text-[9px] font-medium',
              isCompleted ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-blue-300'
            )}>
              {getStatusLabel(item.status)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* NOTE: The blocking full-screen upload overlay has been REMOVED.
          Uploads now run completely in the background. The bottom-right
          UploadQueuePanel (rendered in AppShell) shows progress without
          blocking any interaction. The user can continue editing the
          product, scroll, change details, upload more images, set primary,
          delete, preview, and reorder — all while uploads are running. */}

      <div className="space-y-3">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm font-medium text-foreground">
              Product Images
            </label>
            <Badge variant="outline" className="text-xs">
              {counterText} · {allImages.length}/{maxImages}
            </Badge>
            {pendingUploads.length > 0 && (
              <Badge className="text-xs bg-blue-500 text-white">
                <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                {pendingUploads.length} uploading
              </Badge>
            )}
            {failedUploads.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {failedUploads.length} failed
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
                disabled={isUploadDisabled}
                aria-label="Take a photo with camera"
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
                disabled={isUploadDisabled}
                aria-label="Upload images from device"
              >
                {totalUploading > 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:mr-1 animate-spin" />
                    <span className="text-xs sm:text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 sm:mr-1" />
                    <span className="text-xs sm:text-sm">Upload</span>
                  </>
                )}
              </Button>
              {/* Manual gallery refresh button — reloads only the image gallery
                  from the server. Does NOT reload the page. Preserves scroll
                  position and unsaved form edits. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsRefreshingGallery(true);
                  try {
                    if (onRefreshImages) await onRefreshImages();
                  } finally {
                    setIsRefreshingGallery(false);
                  }
                }}
                className="h-11 px-3 flex-1 sm:flex-none"
                disabled={isRefreshingGallery}
                aria-label="Refresh image gallery"
                title="Refresh Gallery"
              >
                {isRefreshingGallery ? (
                  <Loader2 className="h-4 w-4 sm:mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 sm:mr-1" />
                )}
                <span className="text-xs sm:text-sm">{isRefreshingGallery ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Validation error banner */}
        {validationError && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{validationError}</span>
            <button
              onClick={() => setValidationError(null)}
              className="text-destructive/70 hover:text-destructive"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileSelect(e, true)}
          className="hidden"
          disabled={isUploadDisabled}
          aria-hidden="true"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          onChange={(e) => handleFileSelect(e, false)}
          className="hidden"
          disabled={isUploadDisabled}
          aria-hidden="true"
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={handleReplaceFile}
          className="hidden"
          aria-hidden="true"
        />

        {/* Drag-drop zone + image grid */}
        {(pendingUploads.length > 0 || failedUploads.length > 0 || allImages.length > 0) ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'rounded-lg border-2 border-dashed transition-colors p-2 sm:p-3',
              isDragOver ? 'border-primary bg-primary/5' : 'border-transparent'
            )}
          >
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg pointer-events-none z-10">
                <div className="bg-background rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Drop images to upload</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {/* Pending upload progress cards (queued + uploading).
                  These are NOT ProductImages — they're upload queue items
                  showing progress. When the upload completes, the card
                  disappears and the real image arrives from the server. */}
              {pendingUploads.sort((a, b) => a.queuePosition - b.queuePosition).map(renderUploadCard)}
              {/* Failed upload cards (show retry/remove) */}
              {failedUploads.map(renderUploadCard)}
              {/* NOTE: Completed uploads are NOT rendered here. The real image
                  arrives from the server via onRefreshImages and is rendered
                  below as a normal ProductImage with full action buttons. */}

              {/* Existing images with drag-and-drop reordering */}
              {!readOnly && onReorder ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={sortedImages.map(i => i.id)} strategy={rectSortingStrategy}>
                    {sortedImages.map((image) => (
                      <SortableImageCard
                        key={image.id}
                        image={image}
                        readOnly={readOnly}
                        onPreview={() => setPreviewImage(image.imageUrl)}
                        onSetPrimary={() => handleSetPrimary(image.id)}
                        onReplace={() => handleReplaceClick(image)}
                        onDelete={() => handleDeleteClick(image)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                sortedImages.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    readOnly={readOnly}
                    onPreview={() => setPreviewImage(image.imageUrl)}
                    onSetPrimary={() => handleSetPrimary(image.id)}
                    onReplace={() => handleReplaceClick(image)}
                    onDelete={() => handleDeleteClick(image)}
                  />
                ))
              )}
            </div>
          </div>
        ) : isLoadingFromServer ? (
          // Skeleton loading state
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          // Empty state — also a drop target
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 sm:p-8 text-center text-muted-foreground transition-colors',
              isDragOver ? 'border-primary bg-primary/5' : '',
              !readOnly && 'cursor-pointer'
            )}
            onClick={() => !readOnly && fileInputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {isDragOver ? 'Drop images here to upload' : 'No images yet'}
            </p>
            {!readOnly && (
              <p className="text-xs mt-1">Take a photo, upload, or drag & drop images here</p>
            )}
          </div>
        )}

        {/* Upload note for background uploads */}
        {useBackgroundUpload && pendingUploads.length > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>
              Images are uploading in background. You can save the product and continue working.
              Uploads will continue automatically.
            </span>
          </div>
        )}

        {/* Image preview dialog (large view) */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl p-2 sm:p-3">
            <DialogTitle className="sr-only">Image Preview</DialogTitle>
            {previewImage && (
              <div className="overflow-auto max-h-[80vh] flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Product preview"
                  className="w-full h-auto rounded-md max-h-[80vh] object-contain"
                  style={{ touchAction: 'pinch-zoom' }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this image?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The image will be permanently removed from the product.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SortableImageCard — image card with drag handle + action buttons
// ─────────────────────────────────────────────────────────────

interface ImageCardProps {
  image: ProductImage;
  readOnly?: boolean;
  onPreview: () => void;
  onSetPrimary: () => void;
  onReplace: () => void;
  onDelete: () => void;
}

function SortableImageCard(props: ImageCardProps) {
  const { image } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <ImageCardInner {...props} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
}

function ImageCard({ ...props }: ImageCardProps) {
  return (
    <div className="relative">
      <ImageCardInner {...props} />
    </div>
  );
}

function ImageCardInner({
  image,
  readOnly,
  onPreview,
  onSetPrimary,
  onReplace,
  onDelete,
  dragHandleProps,
  isDragging,
}: ImageCardProps & { dragHandleProps?: any; isDragging?: boolean }) {
  return (
    <div
      className={cn(
        'relative aspect-square rounded-lg overflow-hidden border bg-muted',
        image.isPrimary ? 'border-amber-400 border-2 ring-2 ring-amber-400/30' : 'border-border',
        isDragging && 'shadow-lg ring-2 ring-primary'
      )}
    >
      {/* Image — pointer-events:none so it NEVER intercepts taps meant for the
          action buttons below. iOS Safari has a bug where an <img> with
          onClick can swallow touch events from overlapping absolutely-positioned
          elements. Preview is now a dedicated button in the action bar instead. */}
      <img
        src={image.thumbnailUrl || image.imageUrl}
        alt="Product"
        className="w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
        loading="lazy"
      />

      {/* Primary badge (always visible, top-left, above image) */}
      {image.isPrimary && (
        <div className="absolute top-1 left-1 z-20 pointer-events-none">
          <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm">
            <Star className="h-3 w-3 mr-0.5 fill-current" />
            Primary
          </Badge>
        </div>
      )}

      {/* Drag handle (top-right, always visible, 44px touch target) */}
      {!readOnly && dragHandleProps && (
        <div
          {...dragHandleProps}
          className="absolute top-0 right-0 z-30 bg-black/60 text-white rounded-bl-lg cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
          style={{ width: 44, height: 44 }}
          aria-label="Drag to reorder"
          role="button"
          tabIndex={0}
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}

      {/* Action buttons — ALWAYS visible (not hover-only), 44px touch targets
          (Apple HIG minimum), z-20 so they're above the image. No Tooltip
          wrappers because Radix Tooltip's Trigger wrapper can intercept touch
          events on iOS Safari. We use native title + aria-label instead. */}
      {!readOnly && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/75 flex items-stretch">
          {/* Set Primary */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSetPrimary(); }}
            disabled={image.isPrimary}
            aria-label={image.isPrimary ? 'Already primary image' : 'Set as primary image'}
            title={image.isPrimary ? 'Primary' : 'Set as Primary'}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-white active:bg-white/25 transition-colors disabled:opacity-60',
              image.isPrimary && 'text-amber-400'
            )}
            style={{ minHeight: 44 }}
          >
            <Star className={cn('h-4 w-4', image.isPrimary && 'fill-current')} />
            <span className="text-[9px] leading-none">{image.isPrimary ? 'Primary' : 'Set Primary'}</span>
          </button>

          {/* Preview */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPreview(); }}
            aria-label="Preview image"
            title="Preview"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-white active:bg-white/25 transition-colors border-l border-white/10"
            style={{ minHeight: 44 }}
          >
            <Eye className="h-4 w-4" />
            <span className="text-[9px] leading-none">Preview</span>
          </button>

          {/* Replace */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReplace(); }}
            aria-label="Replace image"
            title="Replace"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-white active:bg-white/25 transition-colors border-l border-white/10"
            style={{ minHeight: 44 }}
          >
            <Pencil className="h-4 w-4" />
            <span className="text-[9px] leading-none">Replace</span>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
            aria-label="Delete image"
            title="Delete"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-red-400 active:bg-red-500/30 transition-colors border-l border-white/10"
            style={{ minHeight: 44 }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-[9px] leading-none">Delete</span>
          </button>
        </div>
      )}

      {/* Read-only preview tap target (when readOnly, the image itself is tappable) */}
      {readOnly && (
        <button
          type="button"
          onClick={onPreview}
          aria-label="Preview image"
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}
    </div>
  );
}
