'use client';

import { useUploadQueue, UploadItem, UploadStatus } from '@/store/upload-queue-context';
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
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Status icon and color mapping
const STATUS_CONFIG: Record<UploadStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  queued: { icon: <Clock className="h-4 w-4" />, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  uploading: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  processing: { icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
};

/**
 * Individual upload item row showing status and progress.
 */
function UploadItemRow({ item }: { item: UploadItem }) {
  const { retryUpload, removeFromQueue } = useUploadQueue();
  const config = STATUS_CONFIG[item.status];

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
      {/* Status indicator */}
      <div className={cn('p-2 rounded-md shrink-0', config.bgColor)}>
        <span className={config.color}>{config.icon}</span>
      </div>

      {/* File info and progress */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.file.name}</div>
        <div className="text-xs text-muted-foreground">
          {item.status === 'queued' && 'Waiting to upload...'}
          {item.status === 'uploading' && `Uploading... ${item.progress}%`}
          {item.status === 'processing' && 'Processing...'}
          {item.status === 'completed' && 'Upload complete'}
          {item.status === 'failed' && (item.error || 'Upload failed')}
        </div>
        {(item.status === 'uploading' || item.status === 'processing') && (
          <Progress value={item.progress} className="h-1 mt-1" />
        )}
      </div>

      {/* File size */}
      <div className="text-xs text-muted-foreground shrink-0">
        {(item.file.size / 1024).toFixed(1)} KB
      </div>

      {/* Actions */}
      {item.status === 'failed' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => retryUpload(item.id)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      )}
      {(item.status === 'completed' || item.status === 'failed') && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-destructive hover:text-destructive"
          onClick={() => removeFromQueue(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Image preview for completed uploads */}
      {item.status === 'completed' && item.imageUrl && (
        <div className="w-12 h-12 rounded overflow-hidden shrink-0">
          <img src={item.imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

/**
 * Upload Queue Panel Component
 * Displays a floating panel showing all queued, uploading, and completed uploads.
 * Can be minimized/expanded.
 */
export function UploadQueuePanel() {
  const { state, clearCompleted, clearFailed, clearAll, setPaused } = useUploadQueue();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Don't show if no uploads
  if (state.items.length === 0) {
    return null;
  }

  // Count by status
  const queuedCount = state.items.filter(i => i.status === 'queued').length;
  const uploadingCount = state.items.filter(i => i.status === 'uploading' || i.status === 'processing').length;
  const completedCount = state.items.filter(i => i.status === 'completed').length;
  const failedCount = state.items.filter(i => i.status === 'failed').length;

  // Floating panel at bottom right of screen
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      <Card className="shadow-lg border-2">
        {/* Header */}
        <CardHeader
          className="pb-2 cursor-pointer select-none hover:bg-accent/30 transition-colors rounded-t-lg"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              {isMinimized ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Queue
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {state.items.length} items
              </Badge>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-1.5">
              {queuedCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5">
                  <Clock className="h-3 w-3 mr-1" />
                  {queuedCount}
                </Badge>
              )}
              {uploadingCount > 0 && (
                <Badge className="text-xs px-1.5 bg-blue-500">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {uploadingCount}
                </Badge>
              )}
              {completedCount > 0 && (
                <Badge className="text-xs px-1.5 bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {completedCount}
                </Badge>
              )}
              {failedCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5">
                  <XCircle className="h-3 w-3 mr-1" />
                  {failedCount}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        {!isMinimized && (
          <CardContent className="pt-2 space-y-3">
            {/* Upload items list */}
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {state.items.map(item => (
                  <UploadItemRow key={item.id} item={item} />
                ))}
              </div>
            </ScrollArea>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setPaused(!state.isPaused)}
                >
                  {state.isPaused ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                </Button>
                {completedCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7" onClick={clearCompleted}>
                    Clear Done
                  </Button>
                )}
                {failedCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7" onClick={clearFailed}>
                    Clear Failed
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={clearAll}>
                Clear All
              </Button>
            </div>

            {/* Concurrent upload info */}
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {uploadingCount}/{state.maxConcurrent} concurrent uploads
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/**
 * Minimal badge indicator for the navbar/toolbar
 * Shows a simple badge with upload count when uploads are active.
 */
export function UploadQueueBadge() {
  const { state } = useUploadQueue();

  if (state.items.length === 0) {
    return null;
  }

  const hasActive = state.items.some(i => i.status === 'uploading' || i.status === 'processing');

  return (
    <Badge
      variant={hasActive ? 'default' : 'secondary'}
      className="gap-1 cursor-pointer"
    >
      {hasActive ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Upload className="h-3 w-3" />
      )}
      {state.items.length}
    </Badge>
  );
}