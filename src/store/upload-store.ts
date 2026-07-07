/**
 * Robust Background Upload Store
 * 
 * Features:
 * - Sequential FIFO upload queue (one at a time, not parallel)
 * - IndexedDB persistence (survives navigation/refresh)
 * - Per-image progress tracking with thumbnails
 * - Background upload continuation after save/close
 * - Failed upload retry without stopping queue
 * - Upload status indicator
 */

import { create } from 'zustand';
import { get, set, del, clear } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type UploadStatus = 
  | 'queued'      // Waiting in queue
  | 'uploading'   // Currently uploading
  | 'processing'  // Upload complete, server processing
  | 'completed'   // Successfully uploaded
  | 'failed';     // Upload failed

export interface UploadItem {
  id: string;                 // Unique identifier
  file: File;                 // The file being uploaded (not persisted)
  fileName: string;           // File name (persisted)
  fileSize: number;           // File size in bytes (persisted)
  fileType: string;           // File MIME type (persisted)
  thumbnail?: string;         // Base64 thumbnail preview (persisted)
  productId: string;          // Product ID
  productName?: string;       // Product name for display
  variantId?: string;         // Optional variant ID
  status: UploadStatus;
  progress: number;           // 0-100 upload progress
  error?: string;             // Error message if failed
  imageUrl?: string;          // Result URL after success
  imageId?: string;           // Result image ID after success
  isPrimary: boolean;         // Whether marked as primary
  retryCount: number;         // Number of retry attempts
  maxRetries: number;         // Max retries allowed (default 3)
  queuePosition: number;      // Position in queue (for FIFO display)
  addedAt: number;            // Timestamp when added
  startedAt?: number;         // Timestamp when upload started
  completedAt?: number;       // Timestamp when completed
}

export interface UploadQueueState {
  items: UploadItem[];
  isProcessing: boolean;      // Whether queue is actively processing
  isPaused: boolean;          // User paused the queue
  totalQueued: number;
  totalUploading: number;
  totalCompleted: number;
  totalFailed: number;
  currentUploadId?: string;   // ID of currently uploading item
}

interface UploadStoreActions {
  // Queue management
  addToQueue: (
    file: File,
    productId: string,
    productName?: string,
    options?: { variantId?: string; isPrimary?: boolean }
  ) => string;
  removeFromQueue: (id: string) => void;
  removeCompletedForProduct: (productId: string) => void;
  clearQueue: () => void;
  clearCompleted: () => void;
  clearFailed: () => void;
  
  // Upload control
  retryUpload: (id: string) => void;
  pauseQueue: () => void;
  resumeQueue: () => void;
  
  // Status updates
  updateProgress: (id: string, progress: number) => void;
  markCompleted: (id: string, imageUrl: string, imageId: string) => void;
  markFailed: (id: string, error: string) => void;
  
  // Processing
  startProcessing: () => void;
  stopProcessing: () => void;
  processNextItem: () => Promise<void>;
  
  // Persistence
  loadPersistedState: () => Promise<void>;
  persistState: () => Promise<void>;
  
  // Getters
  getItemsForProduct: (productId: string) => UploadItem[];
  getPendingItemsForProduct: (productId: string) => UploadItem[];
  getCompletedItemsForProduct: (productId: string) => UploadItem[];
}

const PERSISTENCE_KEY = 'upload-queue-state';
const MAX_RETRIES = 3;
const MAX_THUMBNAIL_SIZE = 100; // Max thumbnail width/height

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/** Generate thumbnail from file */
async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate thumbnail dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_THUMBNAIL_SIZE) {
            height = Math.round(height * (MAX_THUMBNAIL_SIZE / width));
            width = MAX_THUMBNAIL_SIZE;
          }
        } else {
          if (height > MAX_THUMBNAIL_SIZE) {
            width = Math.round(width * (MAX_THUMBNAIL_SIZE / height));
            height = MAX_THUMBNAIL_SIZE;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Create a serializable version of state (without File objects) */
function serializeState(state: UploadQueueState): Omit<UploadItem, 'file'>[] {
  return state.items.map(item => ({
    id: item.id,
    fileName: item.fileName,
    fileSize: item.fileSize,
    fileType: item.fileType,
    thumbnail: item.thumbnail,
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    status: item.status,
    progress: item.progress,
    error: item.error,
    imageUrl: item.imageUrl,
    imageId: item.imageId,
    isPrimary: item.isPrimary,
    retryCount: item.retryCount,
    maxRetries: item.maxRetries,
    queuePosition: item.queuePosition,
    addedAt: item.addedAt,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
  }));
}

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────

const initialState: UploadQueueState = {
  items: [],
  isProcessing: false,
  isPaused: false,
  totalQueued: 0,
  totalUploading: 0,
  totalCompleted: 0,
  totalFailed: 0,
};

// ─────────────────────────────────────────────────────────────
// Store Definition
// ─────────────────────────────────────────────────────────────

export const useUploadStore = create<UploadQueueState & UploadStoreActions>((set, get) => ({
  ...initialState,

  // ── Queue Management ───────────────────────────────────────
  
  addToQueue: async (file, productId, productName, options) => {
    const id = uuidv4();
    
    const state = get();
    const nextPosition = state.items.filter(i => i.status === 'queued').length + 1;
    
    // CRITICAL: Add the item to the store SYNCHRONOUSLY first, so the upload
    // card appears immediately in the UI (fixes iOS Safari BUG 1 where the
    // user sees no feedback after selecting an image). The thumbnail is
    // generated and backfilled below — the card shows a placeholder icon
    // until the thumbnail is ready (usually <100ms).
    const newItem: UploadItem = {
      id,
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      thumbnail: undefined, // Backfilled after generation
      productId,
      productName,
      variantId: options?.variantId,
      status: 'queued',
      progress: 0,
      isPrimary: options?.isPrimary ?? false,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      queuePosition: nextPosition,
      addedAt: Date.now(),
    };
    
    set((state) => ({
      items: [...state.items, newItem],
      totalQueued: state.totalQueued + 1,
    }));
    
    // Persist state
    get().persistState();
    
    // Generate thumbnail asynchronously and backfill into the item
    generateThumbnail(file).then((thumbnail) => {
      set((state) => ({
        items: state.items.map(item =>
          item.id === id ? { ...item, thumbnail } : item
        ),
      }));
      get().persistState();
    });
    
    // Start processing if not already
    // Guard: check that startProcessing is a function before calling it.
    // During store initialization or hot-reload, get() can return a partial
    // state where actions aren't bound yet, causing "startProcessing is not
    // a function" errors.
    if (!state.isProcessing && !state.isPaused) {
      const startProcessing = get().startProcessing;
      if (typeof startProcessing === 'function') {
        startProcessing();
      }
    }
    
    return id;
  },

  removeFromQueue: (id) => {
    set((state) => {
      const item = state.items.find(i => i.id === id);
      if (!item) return state;
      
      const newItems = state.items.filter(i => i.id !== id);
      
      return {
        items: newItems,
        totalQueued: item.status === 'queued' ? state.totalQueued - 1 : state.totalQueued,
        totalUploading: item.status === 'uploading' ? state.totalUploading - 1 : state.totalUploading,
        totalCompleted: item.status === 'completed' ? state.totalCompleted - 1 : state.totalCompleted,
        totalFailed: item.status === 'failed' ? state.totalFailed - 1 : state.totalFailed,
        currentUploadId: state.currentUploadId === id ? undefined : state.currentUploadId,
      };
    });
    get().persistState();
  },

  removeCompletedForProduct: (productId) => {
    set((state) => {
      const completedForProduct = state.items.filter(
        i => i.productId === productId && i.status === 'completed'
      );
      const newItems = state.items.filter(
        i => i.productId !== productId || i.status !== 'completed'
      );
      
      return {
        items: newItems,
        totalCompleted: state.totalCompleted - completedForProduct.length,
      };
    });
    get().persistState();
  },

  clearQueue: () => {
    set(initialState);
    clear(); // Clear IndexedDB
  },

  clearCompleted: () => {
    set((state) => {
      const completedCount = state.items.filter(i => i.status === 'completed').length;
      return {
        items: state.items.filter(i => i.status !== 'completed'),
        totalCompleted: 0,
      };
    });
    get().persistState();
  },

  clearFailed: () => {
    set((state) => {
      const failedCount = state.items.filter(i => i.status === 'failed').length;
      return {
        items: state.items.filter(i => i.status !== 'failed'),
        totalFailed: 0,
      };
    });
    get().persistState();
  },

  // ── Upload Control ─────────────────────────────────────────

  retryUpload: (id) => {
    set((state) => {
      const items = state.items.map(item => {
        if (item.id !== id) return item;
        
        // Check if can retry
        if (item.retryCount >= item.maxRetries) return item;
        
        return {
          ...item,
          status: 'queued' as UploadStatus,
          error: undefined,
          progress: 0,
          retryCount: item.retryCount + 1,
          queuePosition: state.items.filter(i => i.status === 'queued').length + 1,
        };
      });
      
      const failedItem = state.items.find(i => i.id === id);
      if (!failedItem || failedItem.retryCount >= failedItem.maxRetries) return state;
      
      return {
        items,
        totalFailed: state.totalFailed - 1,
        totalQueued: state.totalQueued + 1,
      };
    });
    get().persistState();
    
    // Resume processing if paused
    const state = get();
    if (state.isPaused) {
      const resumeQueue = get().resumeQueue;
      if (typeof resumeQueue === 'function') resumeQueue();
    } else if (!state.isProcessing) {
      const startProcessing = get().startProcessing;
      if (typeof startProcessing === 'function') startProcessing();
    }
  },

  pauseQueue: () => {
    set({ isPaused: true });
    get().persistState();
  },

  resumeQueue: () => {
    set({ isPaused: false });
    get().persistState();
    
    if (!get().isProcessing) {
      const startProcessing = get().startProcessing;
      if (typeof startProcessing === 'function') startProcessing();
    }
  },

  // ── Status Updates ─────────────────────────────────────────

  updateProgress: (id, progress) => {
    set((state) => ({
      items: state.items.map(item =>
        item.id === id ? { ...item, progress } : item
      ),
    }));
    // Don't persist on every progress update (too frequent)
  },

  markCompleted: (id, imageUrl, imageId) => {
    set((state) => ({
      items: state.items.map(item =>
        item.id === id
          ? {
              ...item,
              status: 'completed',
              progress: 100,
              imageUrl,
              imageId,
              completedAt: Date.now(),
            }
          : item
      ),
      totalUploading: state.totalUploading - 1,
      totalCompleted: state.totalCompleted + 1,
      currentUploadId: undefined,
    }));
    get().persistState();
    
    // Process next item
    const processNextItem = get().processNextItem;
    if (typeof processNextItem === 'function') processNextItem();
  },

  markFailed: (id, error) => {
    set((state) => {
      const item = state.items.find(i => i.id === id);
      const canRetry = item && item.retryCount < item.maxRetries;
      
      return {
        items: state.items.map(i =>
          i.id === id
            ? { ...i, status: 'failed', error, progress: 0 }
            : i
        ),
        totalUploading: state.totalUploading - 1,
        totalFailed: state.totalFailed + 1,
        currentUploadId: undefined,
      };
    });
    get().persistState();
    
    // Continue with next item (don't stop queue on failure)
    const processNextItem = get().processNextItem;
    if (typeof processNextItem === 'function') processNextItem();
  },

  // ── Processing ─────────────────────────────────────────────

  startProcessing: () => {
    set({ isProcessing: true });
    get().processNextItem();
  },

  stopProcessing: () => {
    set({ isProcessing: false });
  },

  processNextItem: async () => {
    const state = get();
    
    // Check if should stop
    if (state.isPaused || !state.isProcessing) {
      set({ isProcessing: false });
      return;
    }
    
    // Check if already uploading (sequential = one at a time)
    if (state.currentUploadId) {
      return;
    }
    
    // Get next queued item (FIFO - oldest first by addedAt)
    const queuedItems = state.items
      .filter(i => i.status === 'queued')
      .sort((a, b) => a.addedAt - b.addedAt);
    
    if (queuedItems.length === 0) {
      set({ isProcessing: false });
      return;
    }
    
    const nextItem = queuedItems[0];
    
    // Mark as uploading
    set((state) => ({
      items: state.items.map(item =>
        item.id === nextItem.id
          ? { ...item, status: 'uploading', startedAt: Date.now() }
          : item
      ),
      totalQueued: state.totalQueued - 1,
      totalUploading: state.totalUploading + 1,
      currentUploadId: nextItem.id,
    }));
    
    // Perform upload
    try {
      const formData = new FormData();
      formData.append('file', nextItem.file);
      formData.append('productId', nextItem.productId);
      if (nextItem.isPrimary) {
        formData.append('isPrimary', 'true');
      }
      
      // Use XHR for progress tracking (fetch() does NOT support upload progress
      // on iOS Safari or any browser).
      const xhr = new XMLHttpRequest();
      
      // iOS SAFARI WORKAROUND: iOS Safari often does not fire upload.onprogress
      // for small files or compressed uploads, leaving the progress bar stuck at
      // 0%. To ensure the user always sees progress, we run a synthetic progress
      // timer that increments slowly. If real XHR progress events arrive, they
      // override the synthetic value (we stop the timer when progress > 0 from
      // real events). The synthetic timer never reaches 100% — it caps at 90%
      // so the final 10% only fills when the server actually responds.
      let syntheticTimer: ReturnType<typeof setInterval> | null = null;
      let receivedRealProgress = false;
      let syntheticProgress = 0;
      
      const startSyntheticProgress = () => {
        if (syntheticTimer) return;
        syntheticTimer = setInterval(() => {
          if (receivedRealProgress) {
            if (syntheticTimer) { clearInterval(syntheticTimer); syntheticTimer = null; }
            return;
          }
          // Increment slowly, cap at 90% (final 10% = server response)
          if (syntheticProgress < 90) {
            // Faster at the start, slower as it approaches 90
            const increment = syntheticProgress < 30 ? 5 : syntheticProgress < 60 ? 3 : 1;
            syntheticProgress = Math.min(90, syntheticProgress + increment);
            get().updateProgress(nextItem.id, syntheticProgress);
          }
        }, 200);
      };
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          receivedRealProgress = true;
          const progress = Math.round((event.loaded / event.total) * 100);
          get().updateProgress(nextItem.id, progress);
        }
        // If lengthComputable is false (iOS Safari sometimes does this for
        // small/compressed files), the synthetic timer keeps things moving.
      };
      
      xhr.upload.onloadstart = () => {
        // Upload started — begin synthetic progress in case real events don't fire
        startSyntheticProgress();
      };
      
      xhr.onload = () => {
        if (syntheticTimer) { clearInterval(syntheticTimer); syntheticTimer = null; }
        // Set to 100% on completion
        get().updateProgress(nextItem.id, 100);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.imageUrl || response.id) {
              get().markCompleted(
                nextItem.id,
                response.imageUrl || '',
                response.id || ''
              );
            } else {
              get().markFailed(nextItem.id, 'Invalid server response');
            }
          } catch {
            get().markFailed(nextItem.id, 'Failed to parse response');
          }
        } else {
          get().markFailed(nextItem.id, `Upload failed: ${xhr.statusText || xhr.status}`);
        }
      };
      
      xhr.onerror = () => {
        if (syntheticTimer) { clearInterval(syntheticTimer); syntheticTimer = null; }
        get().markFailed(nextItem.id, 'Network error');
      };
      
      xhr.open('POST', '/api/images/upload');
      xhr.send(formData);
      
    } catch (error) {
      get().markFailed(nextItem.id, error instanceof Error ? error.message : 'Upload failed');
    }
  },

  // ── Persistence ────────────────────────────────────────────

  loadPersistedState: async () => {
    try {
      const persistedData = await get(PERSISTENCE_KEY);
      
      if (!persistedData || !Array.isArray(persistedData)) {
        return;
      }
      
      // Restore state (note: File objects are lost on refresh)
      // Items that were 'queued' or 'uploading' will need to be reset
      const restoredItems: UploadItem[] = persistedData.map((item: any) => ({
        ...item,
        file: null as any, // File object lost, will need re-upload
        // Reset uploading items to failed (can't resume without file)
        status: item.status === 'uploading' ? 'failed' : item.status,
        error: item.status === 'uploading' 
          ? 'Upload interrupted (page refresh)' 
          : item.error,
      }));
      
      const totalQueued = restoredItems.filter(i => i.status === 'queued').length;
      const totalUploading = 0; // All uploading reset to failed
      const totalCompleted = restoredItems.filter(i => i.status === 'completed').length;
      const totalFailed = restoredItems.filter(i => i.status === 'failed').length;
      
      set({
        items: restoredItems,
        totalQueued,
        totalUploading,
        totalCompleted,
        totalFailed,
      });
      
    } catch (error) {
      console.error('Failed to load persisted upload state:', error);
    }
  },

  persistState: async () => {
    try {
      const state = get();
      const serialized = serializeState(state);
      await set(PERSISTENCE_KEY, serialized);
    } catch (error) {
      console.error('Failed to persist upload state:', error);
    }
  },

  // ── Getters ────────────────────────────────────────────────

  getItemsForProduct: (productId) => {
    // Defensive: ensure items is always an array. If IndexedDB persistence
    // load fails or corrupts state, items could be undefined. Returning []
    // prevents "Cannot read properties of undefined (reading 'filter')" in
    // the gallery.
    const items = get().items;
    if (!Array.isArray(items)) return [];
    return items.filter(i => i && i.productId === productId);
  },

  getPendingItemsForProduct: (productId) => {
    const items = get().items;
    if (!Array.isArray(items)) return [];
    return items.filter(
      i => i && i.productId === productId &&
      (i.status === 'queued' || i.status === 'uploading' || i.status === 'processing')
    );
  },

  getCompletedItemsForProduct: (productId) => {
    const items = get().items;
    if (!Array.isArray(items)) return [];
    return items.filter(
      i => i && i.productId === productId && i.status === 'completed'
    );
  },
}));

// ─────────────────────────────────────────────────────────────
// Initialize on app load
// ─────────────────────────────────────────────────────────────

// Auto-load persisted state on first use
let initialized = false;
export async function initializeUploadStore() {
  if (!initialized) {
    initialized = true;
    await useUploadStore.getState().loadPersistedState();
    
    // Resume any queued items
    const state = useUploadStore.getState();
    if (state.totalQueued > 0 && !state.isPaused) {
      useUploadStore.getState().startProcessing();
    }
  }
}