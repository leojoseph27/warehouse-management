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
  X,
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
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50">
      {/* Status indicator */}
      <div className={cn('p-1.5 sm:p-2 rounded-md shrink-0', config.bgColor)}>
        <span className={config.color}>{config.icon}</span>
      </div>

      {/* File info and progress */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-truncate">{item.file.name}</div>
        <div className="text-xs text-muted-foreground">
          {item.status === 'queued' && 'Waiting...'}
          {item.status === 'uploading' && `Uploading... ${item.progress}%`}
          {item.status === 'processing' && 'Processing...'}
          {item.status === 'completed' && 'Complete'}
          {item.status === 'failed' && (item.error || 'Failed')}
        </div>
        {(item.status === 'uploading' || item.status === 'processing') && (
          <Progress value={item.progress} className="h-1 mt-1" />
        )}
      </div>

      {/* File size - hide on very small screens */}
      <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
        {(item.file.size / 1024).toFixed(1)} KB
      </div>

      {/* Actions */}
      {item.status === 'failed' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 shrink-0"
          onClick={() => retryUpload(item.id)}
          title="Retry"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
      {(item.status === 'completed' || item.status === 'failed') && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 shrink-0 text-destructive hover:text-destructive"
          onClick={() => removeFromQueue(item.id)}
          title="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Image preview for completed uploads */}
      {item.status === 'completed' && item.imageUrl && (
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden shrink-0">
          <img src={item.imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

/**
 * Upload Queue Panel Component
 * Displays a floating panel showing all queued, uploading, and completed uploads.
 * Positioned to avoid mobile bottom navigation.
 */
export function UploadQueuePanel() {
  const { state, clearCompleted, clearFailed, clearAll, setPaused } = useUploadQueue();
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

  // Floating panel - positioned above mobile nav (bottom: 4rem on mobile, 1rem on desktop)
  return (
    <div className="fixed bottom-14 md:bottom-4 right-3 sm:right-4 z-50 w-[calc(100vw-1.5rem)] sm:max-w-sm">
      <Card className="shadow-lg border-2">
        {/* Header - clickable to minimize */}
        <CardHeader
          className="pb-2 cursor-pointer select-none hover:bg-accent/30 transition-colors rounded-t-lg px-3 sm:px-4"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 min-w-0">
              {isMinimized ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <CardTitle className="text-sm flex items-center gap-2">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="text-truncate">Upload Queue</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs shrink-0">
                {state.items.length}
              </Badge>
            </div>

            {/* Status indicators - hide on very small when minimized */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {queuedCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1 sm:px-1.5">
                  <Clock className="h-3 w-3 mr-0.5 sm:mr-1" />
                  {queuedCount}
                </Badge>
              )}
              {uploadingCount > 0 && (
                <Badge className="text-xs px-1 sm:px-1.5 bg-blue-500">
                  <Loader2 className="h-3 w-3 mr-0.5 sm:mr-1 animate-spin" />
                  {uploadingCount}
                </Badge>
              )}
              {!isMinimized && completedCount > 0 && (
                <Badge className="text-xs px-1 sm:px-1.5 bg-green-500 hidden sm:flex">
                  <CheckCircle2 className="h-3 w-3 mr-0.5 sm:mr-1" />
                  {completedCount}
                </Badge>
              )}
              {!isMinimized && failedCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1 sm:px-1.5 hidden sm:flex">
                  <XCircle className="h-3 w-3 mr-0.5 sm:mr-1" />
                  {failedCount}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        {!isMinimized && (
          <CardContent className="pt-2 space-y-3 px-3 sm:px-4 pb-3 sm:pb-4">
            {/* Upload items list */}
            <ScrollArea className="h-[150px] sm:h-[200px]">
              <div className="space-y-2">
                {state.items.map(item => (
                  <UploadItemRow key={item.id} item={item} />
                ))}
              </div>
            </ScrollArea>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 sm:h-7 sm:w-7 p-0"
                  onClick={() => setPaused(!state.isPaused)}
                  title={state.isPaused ? 'Resume' : 'Pause'}
                >
                  {state.isPaused ? (
                    <Play className="h-4 sm:h-3.5 w-4 sm:w-3.5" />
                  ) : (
                    <Pause className="h-4 sm:h-3.5 w-4 sm:w-3.5" />
                  )}
                </Button>
                {completedCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-9 sm:h-7 text-xs" onClick={clearCompleted}>
                    Clear Done
                  </Button>
                )}
                {failedCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-9 sm:h-7 text-xs" onClick={clearFailed}>
                    Clear Failed
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-9 sm:h-7 text-xs text-destructive" onClick={clearAll}>
                Clear All
              </Button>
            </div>

            {/* Concurrent upload info */}
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {uploadingCount}/{state.maxConcurrent} concurrent
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/**
 * Minimal badge indicator for the navbar/toolbar
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
      className="gap-1 cursor-pointer min-h-[28px] px-2"
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