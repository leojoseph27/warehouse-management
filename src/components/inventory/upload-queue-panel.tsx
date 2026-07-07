'use client';

import { useUploadStore, UploadItem, UploadStatus } from '@/store/upload-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Trash2,
  RefreshCw,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Status icon and color mapping
const STATUS_CONFIG: Record<UploadStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  queued: { 
    icon: <Clock className="h-4 w-4" />, 
    color: 'text-gray-500', 
    bgColor: 'bg-gray-100',
    label: 'Waiting'
  },
  uploading: { 
    icon: <Loader2 className="h-4 w-4 animate-spin" />, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
    label: 'Uploading'
  },
  processing: { 
    icon: <Loader2 className="h-4 w-4 animate-spin" />, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100',
    label: 'Processing'
  },
  completed: { 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    color: 'text-green-600', 
    bgColor: 'bg-green-100',
    label: 'Complete'
  },
  failed: { 
    icon: <XCircle className="h-4 w-4" />, 
    color: 'text-red-600', 
    bgColor: 'bg-red-100',
    label: 'Failed'
  },
};

/**
 * Individual upload item card showing detailed progress
 */
function UploadItemCard({ item }: { item: UploadItem }) {
  const { retryUpload, removeFromQueue } = useUploadStore();
  const config = STATUS_CONFIG[item.status];
  
  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Progress bar color based on status
  const progressColor = item.status === 'failed' 
    ? 'bg-red-500' 
    : item.status === 'completed' 
      ? 'bg-green-500' 
      : 'bg-blue-500';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
      {/* Thumbnail or placeholder */}
      <div className="w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {item.thumbnail ? (
          <img 
            src={item.thumbnail} 
            alt={item.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* File name */}
        <div className="text-sm font-medium truncate" title={item.fileName}>
          {item.fileName}
        </div>
        
        {/* File size */}
        <div className="text-xs text-muted-foreground">
          {formatSize(item.fileSize)}
        </div>
        
        {/* Status and progress */}
        {(item.status === 'uploading' || item.status === 'processing') && (
          <div className="mt-2 space-y-1">
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn('h-full transition-all duration-300', progressColor)}
                style={{ width: `${item.progress}%` }}
              />
            </div>
            {/* Percentage */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {config.label}...
              </span>
              <span className="font-medium">
                {item.progress}%
              </span>
            </div>
          </div>
        )}
        
        {/* Completed status */}
        {item.status === 'completed' && (
          <div className="mt-1 flex items-center gap-1.5 text-green-600 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Upload Complete</span>
          </div>
        )}
        
        {/* Queued status */}
        {item.status === 'queued' && (
          <div className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span>Position #{item.queuePosition}</span>
          </div>
        )}
        
        {/* Failed status */}
        {item.status === 'failed' && (
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-1.5 text-red-600 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              <span className="truncate" title={item.error}>
                {item.error || 'Upload failed'}
              </span>
            </div>
            {item.retryCount > 0 && (
              <div className="text-xs text-muted-foreground">
                Retry {item.retryCount}/{item.maxRetries}
              </div>
            )}
          </div>
        )}
        
        {/* Product name */}
        {item.productName && (
          <div className="mt-1 text-xs text-muted-foreground truncate">
            Product: {item.productName}
          </div>
        )}
      </div>
      
      {/* Status badge */}
      <Badge 
        variant={item.status === 'failed' ? 'destructive' : 'secondary'}
        className={cn('shrink-0 text-xs', item.status === 'uploading' && 'bg-blue-500 text-white')}
      >
        {config.icon}
        <span className="ml-1 hidden sm:inline">{config.label}</span>
      </Badge>
      
      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {item.status === 'failed' && item.retryCount < item.maxRetries && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => retryUpload(item.id)}
            title="Retry upload"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        {(item.status === 'completed' || item.status === 'failed') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => removeFromQueue(item.id)}
            title="Remove from list"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Completed image preview */}
      {item.status === 'completed' && item.imageUrl && (
        <div className="w-14 h-14 rounded-md overflow-hidden shrink-0 border">
          <img src={item.imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

/**
 * Upload Queue Panel Component
 * 
 * Displays a floating panel showing all queued, uploading, and completed uploads.
 * Positioned to avoid mobile bottom navigation.
 * 
 * Features:
 * - Detailed per-image progress with thumbnails
 * - Sequential FIFO queue display
 * - Retry failed uploads
 * - Clear completed/failed items
 */
export function UploadQueuePanel() {
  const { 
    items, 
    isPaused, 
    isProcessing,
    totalQueued, 
    totalUploading, 
    totalCompleted, 
    totalFailed,
    clearCompleted, 
    clearFailed, 
    clearQueue,
    pauseQueue, 
    resumeQueue,
  } = useUploadStore();
  
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Initialize store on mount
  useEffect(() => {
    // Import and call initialize
    import('@/store/upload-store').then(({ initializeUploadStore }) => {
      initializeUploadStore();
    });
  }, []);

  // ── DIAGNOSTIC LOG: capture when items is undefined ──
  if (process.env.NODE_ENV !== 'production') {
    if (!Array.isArray(items)) {
      console.error('[UploadQueuePanel] items is NOT an array', {
        items,
        itemsType: typeof items,
        stack: new Error().stack,
      });
    }
  }
  
  // Don't show if no uploads
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  
  // Sort items: uploading first, then queued by position, then completed/failed
  const sortedItems = [...items].sort((a, b) => {
    // Uploading first
    if (a.status === 'uploading' && b.status !== 'uploading') return -1;
    if (b.status === 'uploading' && a.status !== 'uploading') return 1;
    
    // Then queued by queuePosition (FIFO order)
    if (a.status === 'queued' && b.status === 'queued') {
      return a.queuePosition - b.queuePosition;
    }
    if (a.status === 'queued' && b.status !== 'queued') return -1;
    if (b.status === 'queued' && a.status !== 'queued') return 1;
    
    // Then completed/failed
    return 0;
  });
  
  // Active uploads (uploading or processing)
  const activeUploads = items.filter(i => i.status === 'uploading' || i.status === 'processing');
  
  // Floating panel - positioned above mobile nav
  return (
    <div className="fixed bottom-14 md:bottom-4 right-3 sm:right-4 z-50 w-[calc(100vw-1.5rem)] sm:max-w-md">
      <Card className="shadow-lg border-2">
        {/* Header - clickable to expand/collapse */}
        <CardHeader
          className="pb-2 cursor-pointer select-none hover:bg-accent/30 transition-colors rounded-t-lg px-3 sm:px-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 min-w-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">Uploads</span>
              </CardTitle>
            </div>
            
            {/* Status counts */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {totalQueued > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5">
                  <Clock className="h-3 w-3 mr-0.5" />
                  {totalQueued}
                </Badge>
              )}
              {totalUploading > 0 && (
                <Badge className="text-xs px-1.5 bg-blue-500 text-white">
                  <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                  {totalUploading}
                </Badge>
              )}
              {isExpanded && totalCompleted > 0 && (
                <Badge className="text-xs px-1.5 bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-0.5" />
                  {totalCompleted}
                </Badge>
              )}
              {isExpanded && totalFailed > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5">
                  <XCircle className="h-3 w-3 mr-0.5" />
                  {totalFailed}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress summary when collapsed */}
          {!isExpanded && activeUploads.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <Progress 
                value={activeUploads[0]?.progress || 0} 
                className="h-2 flex-1" 
              />
              <span className="text-xs text-muted-foreground shrink-0">
                {activeUploads[0]?.progress || 0}%
              </span>
            </div>
          )}
        </CardHeader>
        
        {/* Content */}
        {isExpanded && (
          <CardContent className="pt-2 space-y-3 px-3 sm:px-4 pb-3 sm:pb-4">
            {/* Queue status message */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isPaused 
                  ? 'Queue paused' 
                  : isProcessing 
                    ? `Processing ${activeUploads.length} of ${totalQueued + totalUploading} remaining`
                    : totalQueued > 0 
                      ? `${totalQueued} waiting`
                      : 'All uploads complete'
                }
              </span>
              <span className="font-medium">
                {items.length} total
              </span>
            </div>
            
            {/* Upload items list */}
            <ScrollArea className="h-[200px] sm:h-[250px]">
              <div className="space-y-2">
                {sortedItems.map(item => (
                  <UploadItemCard key={item.id} item={item} />
                ))}
              </div>
            </ScrollArea>
            
            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t">
              <div className="flex items-center gap-1">
                {/* Pause/Resume */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => isPaused ? resumeQueue() : pauseQueue()}
                  title={isPaused ? 'Resume uploads' : 'Pause uploads'}
                  disabled={totalQueued === 0 && totalUploading === 0}
                >
                  {isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                
                {/* Clear completed */}
                {totalCompleted > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs" 
                    onClick={clearCompleted}
                  >
                    Clear Done
                  </Button>
                )}
                
                {/* Clear failed */}
                {totalFailed > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs text-destructive" 
                    onClick={clearFailed}
                  >
                    Clear Failed
                  </Button>
                )}
              </div>
              
              {/* Clear all */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-destructive" 
                onClick={clearQueue}
              >
                Clear All
              </Button>
            </div>
            
            {/* Sequential upload note */}
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Sequential upload (FIFO)
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/**
 * Minimal badge indicator for navbar/toolbar
 */
export function UploadQueueBadge() {
  const { items, totalUploading, totalQueued } = useUploadStore();
  
  useEffect(() => {
    import('@/store/upload-store').then(({ initializeUploadStore }) => {
      initializeUploadStore();
    });
  }, []);
  
  if (items.length === 0) {
    return null;
  }
  
  const hasActive = totalUploading > 0;
  const remaining = totalQueued + totalUploading;
  
  return (
    <Badge
      variant={hasActive ? 'default' : 'secondary'}
      className="gap-1 cursor-pointer min-h-[28px] px-2"
    >
      {hasActive ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Upload className="h-3 w-3" />
      )}
      <span className="text-xs">{remaining} remaining</span>
    </Badge>
  );
}