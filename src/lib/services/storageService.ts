import type { Recording } from '$lib/types';
import { isWeb } from '$lib/utils/platformDetector';
import { IndexedDBStorage } from './storage/indexedDBStorage';
import { FilesystemStorage } from './storage/filesystemStorage';
import { CodecConverter, type ConversionOptions } from './storage/codecConverter';

/**
 * Unified storage interface for cross-platform audio recording management.
 * Abstracts web (IndexedDB) and mobile (Capacitor Filesystem) storage.
 *
 * Factory Pattern: Selects appropriate storage backend at runtime
 */

/**
 * Storage service interface (unified across platforms)
 */
export interface StorageService {
  initialize(): Promise<void>;
  saveRecording(recording: Recording): Promise<void>;
  updateRecording(id: string, updates: Partial<Recording>): Promise<void>;
  loadRecording(id: string): Promise<Recording | null>;
  listRecordings(filter?: {
    format?: Recording['format'];
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<Recording[]>;
  deleteRecording(id: string): Promise<void>;
  getStatistics(): Promise<{
    count: number;
    totalSize: number;
    oldestRecording?: number;
    newestRecording?: number;
  }>;
  clearAll(): Promise<void>;
  convertCodec(blob: Blob, from: Recording['format'], to: Recording['format']): Promise<Blob>;
}

/**
 * Concrete storage service implementation (internal use)
 */
class StorageServiceImpl implements StorageService {
  private backend: IndexedDBStorage | FilesystemStorage;
  private converter: CodecConverter;
  private platform: 'web' | 'mobile';

  constructor() {
    this.platform = isWeb() ? 'web' : 'mobile';
    this.backend = this.platform === 'web'
      ? new IndexedDBStorage()
      : new FilesystemStorage();
    this.converter = new CodecConverter();
  }

  async initialize(): Promise<void> {
    try {
      await this.backend.initialize();
      // Keep converter lazy-loaded to avoid loading ffmpeg core on app startup.
    } catch (error) {
      console.error(`Storage initialization failed on ${this.platform}:`, error);
      throw error;
    }
  }

  async saveRecording(recording: Recording): Promise<void> {
    try {
      await this.backend.saveRecording(recording);
    } catch (error) {
      console.error('Failed to save recording:', error);
      throw error;
    }
  }

  async updateRecording(id: string, updates: Partial<Recording>): Promise<void> {
    try {
      // Load existing recording
      const existing = await this.backend.loadRecording(id);
      if (!existing) {
        throw new Error(`Recording ${id} not found`);
      }

      // Merge updates with existing data
      const updated: Recording = {
        ...existing,
        ...updates,
        // Ensure ID and timestamp aren't overwritten
        id: existing.id,
        timestamp: existing.timestamp,
      };

      // Save updated recording
      await this.backend.saveRecording(updated);
    } catch (error) {
      console.error('Failed to update recording:', error);
      throw error;
    }
  }

  async loadRecording(id: string): Promise<Recording | null> {
    try {
      return await this.backend.loadRecording(id);
    } catch (error) {
      console.error('Failed to load recording:', error);
      throw error;
    }
  }

  async listRecordings(filter?: {
    format?: Recording['format'];
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<Recording[]> {
    try {
      return await this.backend.listRecordings(filter);
    } catch (error) {
      console.error('Failed to list recordings:', error);
      throw error;
    }
  }

  async deleteRecording(id: string): Promise<void> {
    try {
      await this.backend.deleteRecording(id);
    } catch (error) {
      console.error('Failed to delete recording:', error);
      throw error;
    }
  }

  async getStatistics(): Promise<{
    count: number;
    totalSize: number;
    oldestRecording?: number;
    newestRecording?: number;
  }> {
    try {
      return await this.backend.getStatistics();
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.backend.clearAll();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  async convertCodec(blob: Blob, from: Recording['format'], to: Recording['format']): Promise<Blob> {
    try {
      // If already in target format, return as-is
      if (from === to) {
        return blob;
      }

      // Map Recording format to codec converter input format
      const inputFormatMap: Record<Recording['format'], ConversionOptions['inputFormat']> = {
        'flac': 'flac',
        'm4a': 'm4a',
        'opus': 'opus',
      };

      const result = await this.converter.convert(blob, {
        inputFormat: inputFormatMap[from] || 'opus',
        outputFormat: to === 'm4a' ? 'm4a' : 'mp4',
      });

      if (!result.success || !result.outputBlob) {
        throw new Error(result.error || 'Codec conversion failed');
      }

      return result.outputBlob;
    } catch (error) {
      console.error(`Failed to convert ${from} to ${to}:`, error);
      throw error;
    }
  }
}

/**
 * Global storage service instance (singleton)
 */
let storageServiceInstance: StorageServiceImpl | null = null;

/**
 * Factory function to create or retrieve the storage service.
 * Returns the same instance on subsequent calls (singleton).
 */
export function createStorageService(): StorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageServiceImpl();
  }
  return storageServiceInstance;
}

/**
 * Reset storage service (for testing or cleanup)
 */
export function resetStorageService(): void {
  storageServiceInstance = null;
}
