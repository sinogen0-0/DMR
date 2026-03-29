import type { Recording } from '$lib/types';

/**
 * IndexedDB-based storage for web platform.
 * Stores recordings with full metadata, optimized for efficient querying.
 */

const DB_NAME = 'DungeonDeckRecorder';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB connection and schema.
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create recordings object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Create indexes for common queries
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('format', 'format', { unique: false });
          store.createIndex('duration', 'duration', { unique: false });
        }
      };
    });

    await this.initPromise;
  }

  /**
   * Save recording to IndexedDB.
   * IndexedDB natively supports Blob storage, no conversion needed.
   */
  async saveRecording(recording: Recording): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(recording);

      request.onerror = () => {
        reject(new Error(`Failed to save recording: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Load single recording by ID.
   * Creates fresh object URL from stored Blob.
   */
  async loadRecording(id: string): Promise<Recording | null> {
    await this.initialize();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error(`Failed to load recording: ${request.error}`));
      };

      request.onsuccess = () => {
        let recording = request.result as Recording | undefined;
        if (recording && recording.blob) {
          // Create fresh object URL from stored Blob
          recording.blobUrl = URL.createObjectURL(recording.blob);
        }
        resolve(recording || null);
      };
    });
  }

  /**
   * List all recordings with optional filtering.
   */
  async listRecordings(filter?: {
    format?: Recording['format'];
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<Recording[]> {
    await this.initialize();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      // Use timestamp index for range queries if dates provided
      let request: IDBRequest<IDBCursorWithValue | null>;

      if (filter?.startTime || filter?.endTime) {
        const index = store.index('timestamp');
        const range = IDBKeyRange.bound(filter?.startTime ?? 0, filter?.endTime ?? Date.now());
        request = index.openCursor(range, 'prev');
      } else {
        request = store.openCursor(null, 'prev');
      }

      const results: Recording[] = [];

      request.onerror = () => {
        reject(new Error(`Failed to list recordings: ${request.error}`));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;

        if (cursor) {
          const recording = cursor.value as Recording;

          // Apply format filter if specified
          if (!filter?.format || recording.format === filter.format) {
            // Create fresh object URL from blob if present
            if (recording.blob) {
              recording.blobUrl = URL.createObjectURL(recording.blob);
            }
            results.push(recording);
          }

          // Apply limit if specified
          if (filter?.limit && results.length >= filter.limit) {
            resolve(results);
            return;
          }

          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  /**
   * Delete recording by ID.
   */
  async deleteRecording(id: string): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to delete recording: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get recording count and statistics.
   */
  async getStatistics(): Promise<{
    count: number;
    totalSize: number;
    oldestRecording?: number;
    newestRecording?: number;
  }> {
    await this.initialize();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      const stats = {
        count: 0,
        totalSize: 0,
        oldestRecording: undefined as number | undefined,
        newestRecording: undefined as number | undefined,
      };

      const allRequest = store.getAll();

      countRequest.onsuccess = () => {
        stats.count = countRequest.result;
      };

      allRequest.onsuccess = () => {
        const recordings = allRequest.result as Recording[];

        recordings.forEach((rec) => {
          stats.totalSize += rec.size || 0;

          if (!stats.oldestRecording || rec.timestamp < stats.oldestRecording) {
            stats.oldestRecording = rec.timestamp;
          }

          if (!stats.newestRecording || rec.timestamp > stats.newestRecording) {
            stats.newestRecording = rec.timestamp;
          }
        });

        resolve(stats);
      };

      transaction.onerror = () => {
        reject(new Error(`Failed to get statistics: ${transaction.error}`));
      };
    });
  }

  /**
   * Clear all recordings from database.
   */
  async clearAll(): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear database: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

}
