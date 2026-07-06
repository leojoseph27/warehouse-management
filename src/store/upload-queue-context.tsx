import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type UploadStatus = 'queued' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface UploadItem {
  id: string;           // Unique identifier for this upload
  file: File;           // The file being uploaded
  productId: string;    // Product ID this image belongs to
  variantId?: string;   // Optional variant ID if uploading to a variant
  status: UploadStatus;
  progress: number;     // 0-100 upload progress
  error?: string;       // Error message if failed
  imageUrl?: string;    // Result image URL after successful upload
  imageId?: string;     // Result image ID after successful upload
  isPrimary?: boolean;  // Whether this is the primary/first image
  retryCount: number;   // Number of retry attempts
  createdAt: Date;      // When this upload was added to queue
  startedAt?: Date;     // When upload started
  completedAt?: Date;   // When upload completed
}

export interface UploadQueueState {
  items: UploadItem[];
  maxConcurrent: number;
  isPaused: boolean;
  totalQueued: number;
  totalUploading: number;
  totalCompleted: number;
  totalFailed: number;
}

type UploadQueueAction =
  | { type: 'ADD_ITEM'; payload: UploadItem }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: UploadStatus; progress?: number; error?: string } }
  | { type: 'SET_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'COMPLETE_UPLOAD'; payload: { id: string; imageUrl: string; imageId: string } }
  | { type: 'FAIL_UPLOAD'; payload: { id: string; error: string } }
  | { type: 'RETRY_UPLOAD'; payload: { id: string } }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'CLEAR_FAILED' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_PAUSED'; payload: boolean }
  | { type: 'PROCESS_QUEUE' };

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────

const initialState: UploadQueueState = {
  items: [],
  maxConcurrent: 3,
  isPaused: false,
  totalQueued: 0,
  totalUploading: 0,
  totalCompleted: 0,
  totalFailed: 0,
};

// ─────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────

function uploadQueueReducer(state: UploadQueueState, action: UploadQueueAction): UploadQueueState {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload],
        totalQueued: state.totalQueued + 1,
      };

    case 'REMOVE_ITEM':
      const removedItem = state.items.find(i => i.id === action.payload.id);
      return {
        ...state,
        items: state.items.filter(i => i.id !== action.payload.id),
        totalQueued: removedItem?.status === 'queued' ? state.totalQueued - 1 : state.totalQueued,
        totalUploading: removedItem?.status === 'uploading' ? state.totalUploading - 1 : state.totalUploading,
        totalCompleted: removedItem?.status === 'completed' ? state.totalCompleted - 1 : state.totalCompleted,
        totalFailed: removedItem?.status === 'failed' ? state.totalFailed - 1 : state.totalFailed,
      };

    case 'UPDATE_STATUS':
      return {
        ...state,
        items: state.items.map(item => {
          if (item.id !== action.payload.id) return item;
          const prevStatus = item.status;
          const newStatus = action.payload.status;
          return {
            ...item,
            status: newStatus,
            progress: action.payload.progress ?? item.progress,
            error: action.payload.error,
            startedAt: newStatus === 'uploading' && prevStatus !== 'uploading' ? new Date() : item.startedAt,
            completedAt: newStatus === 'completed' && prevStatus !== 'completed' ? new Date() : item.completedAt,
          };
        }),
        totalQueued: calculateCount(state.items, 'queued', action.payload.id, action.payload.status),
        totalUploading: calculateCount(state.items, 'uploading', action.payload.id, action.payload.status),
        totalCompleted: calculateCount(state.items, 'completed', action.payload.id, action.payload.status),
        totalFailed: calculateCount(state.items, 'failed', action.payload.id, action.payload.status),
      };

    case 'SET_PROGRESS':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, progress: action.payload.progress }
            : item
        ),
      };

    case 'COMPLETE_UPLOAD':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? {
                ...item,
                status: 'completed' as UploadStatus,
                imageUrl: action.payload.imageUrl,
                imageId: action.payload.imageId,
                progress: 100,
                completedAt: new Date(),
              }
            : item
        ),
        totalUploading: state.totalUploading - 1,
        totalCompleted: state.totalCompleted + 1,
      };

    case 'FAIL_UPLOAD':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? {
                ...item,
                status: 'failed' as UploadStatus,
              error: action.payload.error,
              retryCount: item.retryCount + 1,
            }
            : item
        ),
        totalUploading: state.totalUploading - 1,
        totalFailed: state.totalFailed + 1,
      };

    case 'RETRY_UPLOAD':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, status: 'queued' as UploadStatus, error: undefined, progress: 0 }
            : item
        ),
        totalFailed: state.totalFailed - 1,
        totalQueued: state.totalQueued + 1,
      };

    case 'CLEAR_COMPLETED':
      const completedCount = state.items.filter(i => i.status === 'completed').length;
      return {
        ...state,
        items: state.items.filter(i => i.status !== 'completed'),
        totalCompleted: 0,
      };

    case 'CLEAR_FAILED':
      const failedCount = state.items.filter(i => i.status === 'failed').length;
      return {
        ...state,
        items: state.items.filter(i => i.status !== 'failed'),
        totalFailed: 0,
      };

    case 'CLEAR_ALL':
      return initialState;

    case 'SET_PAUSED':
      return {
        ...state,
        isPaused: action.payload,
      };

    default:
      return state;
  }
}

// Helper to calculate counts after status change
function calculateCount(
  items: UploadItem[],
  targetStatus: UploadStatus,
  changedId: string,
  newStatus: UploadStatus
): number {
  return items.filter(item =>
    item.id === changedId
      ? newStatus === targetStatus
      : item.status === targetStatus
  ).length;
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

interface UploadQueueContextValue {
  state: UploadQueueState;
  addToQueue: (file: File, productId: string, options?: { variantId?: string; isPrimary?: boolean }) => string;
  removeFromQueue: (id: string) => void;
  retryUpload: (id: string) => void;
  clearCompleted: () => void;
  clearFailed: () => void;
  clearAll: () => void;
  setPaused: (paused: boolean) => void;
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function UploadQueueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(uploadQueueReducer, initialState);
  const uploadWorkerRef = useRef<UploadWorker | null>(null);

  // Generate unique ID for upload item
  const generateId = useCallback(() => {
    return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add item to queue
  const addToQueue = useCallback((
    file: File,
    productId: string,
    options?: { variantId?: string; isPrimary?: boolean }
  ): string => {
    const id = generateId();
    const item: UploadItem = {
      id,
      file,
      productId,
      variantId: options?.variantId,
      status: 'queued',
      progress: 0,
      isPrimary: options?.isPrimary,
      retryCount: 0,
      createdAt: new Date(),
    };
    dispatch({ type: 'ADD_ITEM', payload: item });
    return id;
  }, [generateId]);

  // Remove item from queue
  const removeFromQueue = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  }, []);

  // Retry failed upload
  const retryUpload = useCallback((id: string) => {
    dispatch({ type: 'RETRY_UPLOAD', payload: { id } });
  }, []);

  // Clear completed items
  const clearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' });
  }, []);

  // Clear failed items
  const clearFailed = useCallback(() => {
    dispatch({ type: 'CLEAR_FAILED' });
  }, []);

  // Clear all items
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  // Pause/resume queue processing
  const setPaused = useCallback((paused: boolean) => {
    dispatch({ type: 'SET_PAUSED', payload: paused });
  }, []);

  // Initialize upload worker
  useEffect(() => {
    uploadWorkerRef.current = new UploadWorker(
      state,
      (id, status, progress, error) => {
        if (status === 'uploading' || status === 'processing') {
          dispatch({ type: 'UPDATE_STATUS', payload: { id, status, progress } });
        } else if (status === 'completed') {
          // This will be handled by COMPLETE_UPLOAD with imageUrl
        } else if (status === 'failed') {
          dispatch({ type: 'FAIL_UPLOAD', payload: { id, error: error || 'Upload failed' } });
        }
      },
      (id, imageUrl, imageId) => {
        dispatch({ type: 'COMPLETE_UPLOAD', payload: { id, imageUrl, imageId } });
      }
    );

    return () => {
      uploadWorkerRef.current?.stop();
    };
  }, []);

  // Process queue on state changes
  useEffect(() => {
    if (!state.isPaused && uploadWorkerRef.current) {
      uploadWorkerRef.current.processQueue(state);
    }
  }, [state.items, state.isPaused, state.maxConcurrent]);

  const value: UploadQueueContextValue = {
    state,
    addToQueue,
    removeFromQueue,
    retryUpload,
    clearCompleted,
    clearFailed,
    clearAll,
    setPaused,
  };

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useUploadQueue() {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error('useUploadQueue must be used within UploadQueueProvider');
  }
  return context;
}

// ─────────────────────────────────────────────────────────────
// Upload Worker Class
// Handles actual upload processing with progress tracking
// ─────────────────────────────────────────────────────────────

class UploadWorker {
  private activeUploads: Map<string, AbortController> = new Map();
  private onStatusChange: (id: string, status: UploadStatus, progress: number, error?: string) => void;
  private onComplete: (id: string, imageUrl: string, imageId: string) => void;

  constructor(
    initialState: UploadQueueState,
    onStatusChange: (id: string, status: UploadStatus, progress: number, error?: string) => void,
    onComplete: (id: string, imageUrl: string, imageId: string) => void
  ) {
    this.onStatusChange = onStatusChange;
    this.onComplete = onComplete;
  }

  processQueue(state: UploadQueueState) {
    // Get queued items waiting to be uploaded
    const queuedItems = state.items.filter(i => i.status === 'queued');
    const uploadingItems = state.items.filter(i => i.status === 'uploading');
    const availableSlots = state.maxConcurrent - uploadingItems.length;

    // Start uploads for available slots
    for (let i = 0; i < Math.min(availableSlots, queuedItems.length); i++) {
      this.startUpload(queuedItems[i]);
    }
  }

  private async startUpload(item: UploadItem) {
    // Create abort controller for this upload
    const abortController = new AbortController();
    this.activeUploads.set(item.id, abortController);

    this.onStatusChange(item.id, 'uploading', 0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('productId', item.productId);
      if (item.isPrimary) {
        formData.append('isPrimary', 'true');
      }

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      // Track progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.onStatusChange(item.id, 'uploading', progress);
        }
      };

      // Handle completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          this.onStatusChange(item.id, 'processing', 100);
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.image) {
              this.onComplete(item.id, response.image.url, response.image.id);
            } else {
              this.onStatusChange(item.id, 'failed', 0, 'Invalid response from server');
            }
          } catch {
            this.onStatusChange(item.id, 'failed', 0, 'Failed to parse server response');
          }
        } else {
          this.onStatusChange(item.id, 'failed', 0, `Upload failed: ${xhr.statusText}`);
        }
        this.activeUploads.delete(item.id);
      };

      // Handle errors
      xhr.onerror = () => {
        this.onStatusChange(item.id, 'failed', 0, 'Network error during upload');
        this.activeUploads.delete(item.id);
      };

      xhr.onabort = () => {
        this.onStatusChange(item.id, 'failed', 0, 'Upload cancelled');
        this.activeUploads.delete(item.id);
      };

      // Start upload
      xhr.open('POST', '/api/images/upload');
      xhr.send(formData);

      // Connect abort controller to XHR
      abortController.signal.addEventListener('abort', () => {
        xhr.abort();
      });

    } catch (error) {
      this.onStatusChange(item.id, 'failed', 0, error instanceof Error ? error.message : 'Upload failed');
      this.activeUploads.delete(item.id);
    }
  }

  // Cancel a specific upload
  cancelUpload(id: string) {
    const controller = this.activeUploads.get(id);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(id);
    }
  }

  // Stop all active uploads
  stop() {
    for (const [id, controller] of this.activeUploads) {
      controller.abort();
    }
    this.activeUploads.clear();
  }
}