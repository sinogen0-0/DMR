import { Filesystem, Directory } from '@capacitor/filesystem';
import type { Recording } from '$lib/types';

/**
 * Capacitor Filesystem-based storage for iOS and Android.
 * Stores recordings and metadata on device filesystem.
 * Maintains a metadata index stored in AppGroup/UserDefaults for quick access.
 */

const RECORDINGS_DIR = 'DungeonDeckRecorder/recordings';
const METADATA_FILE = 'DungeonDeckRecorder/metadata.json';

interface StoredMetadata {
  recordings: Record<string, Omit<Recording, 'blobUrl'>>;
  lastUpdated: number;
}

export class FilesystemStorage {
  private metadataCache: StoredMetadata | null = null;

  /**
   * Initialize filesystem storage directory structure.
   */
  async initialize(): Promise<void> {
    try {
      // Create recordings directory if it doesn't exist
      await Filesystem.mkdir({
        path: RECORDINGS_DIR,
        directory: Directory.Documents,
        recursive: true,
      });

      // Load metadata index
      await this.loadMetadata();
    } catch (error) {
      throw new Error(`Failed to initialize filesystem storage: ${error}`);
    }
  }

  /**
   * Load metadata index from filesystem.
   */
  private async loadMetadata(): Promise<void> {
    try {
      const result = await Filesystem.readFile({
        path: METADATA_FILE,
        directory: Directory.Documents,
      });

      const text = typeof result.data === 'string' ? result.data : new TextDecoder().decode((result.data as unknown) as Uint8Array);
      this.metadataCache = JSON.parse(text);
    } catch {
      // Metadata file doesn't exist yet, initialize empty
      this.metadataCache = {
        recordings: {},
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Save metadata index to filesystem.
   */
  private async saveMetadata(): Promise<void> {
    if (!this.metadataCache) {
      throw new Error('Metadata cache not initialized');
    }

    try {
      this.metadataCache.lastUpdated = Date.now();
      await Filesystem.writeFile({
        path: METADATA_FILE,
        data: JSON.stringify(this.metadataCache, null, 2),
        directory: Directory.Documents,
        recursive: true,
      });
    } catch (error) {
      throw new Error(`Failed to save metadata: ${error}`);
    }
  }

  /**
   * Save recording to filesystem with metadata tracking.
   */
  async saveRecording(recording: Recording): Promise<void> {
    try {
      await this.initialize();

      if (!this.metadataCache) {
        throw new Error('Metadata cache not initialized');
      }

      // If recording has blobUrl, save the blob to filesystem
      if (recording.blobUrl) {
        const fileName = `${recording.id}.${recording.format}`;
        const filePath = `${RECORDINGS_DIR}/${fileName}`;

        // Fetch blob from URL and convert to base64
        const response = await fetch(recording.blobUrl);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

        await Filesystem.writeFile({
          path: filePath,
          data: base64String,
          directory: Directory.Documents,
          recursive: true,
        });
      }

      // Store metadata (without blobUrl, which is transient)
      const metadata = { ...recording };
      delete metadata.blobUrl;

      this.metadataCache.recordings[recording.id] = metadata as Omit<Recording, 'blobUrl'>;
      await this.saveMetadata();
    } catch (error) {
      throw new Error(`Failed to save recording: ${error}`);
    }
  }

  /**
   * Load recording from filesystem by ID.
   */
  async loadRecording(id: string): Promise<Recording | null> {
    try {
      await this.initialize();

      if (!this.metadataCache) {
        throw new Error('Metadata cache not initialized');
      }

      const metadata = this.metadataCache.recordings[id];
      if (!metadata) {
        return null;
      }

      // Try to load the recording file
      try {
        const fileName = `${id}.${metadata.format}`;
        const filePath = `${RECORDINGS_DIR}/${fileName}`;

        await Filesystem.readFile({
          path: filePath,
          directory: Directory.Documents,
        });

        // Create blob URL for playback (on mobile, this is a file path reference)
        const path = `${Directory.Documents}/${RECORDINGS_DIR}/${fileName}`;

        return {
          ...metadata,
          path,
        };
      } catch {
        // File might not exist, return metadata only
        return metadata;
      }
    } catch (error) {
      throw new Error(`Failed to load recording: ${error}`);
    }
  }

  /**
   * List all recordings.
   */
  async listRecordings(filter?: {
    format?: Recording['format'];
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<Recording[]> {
    try {
      await this.initialize();

      if (!this.metadataCache) {
        throw new Error('Metadata cache not initialized');
      }

      let recordings = Object.values(this.metadataCache.recordings);

      // Apply filters
      if (filter?.format) {
        recordings = recordings.filter((r) => r.format === filter.format);
      }

      if (filter?.startTime || filter?.endTime) {
        recordings = recordings.filter((r) => {
          if (filter.startTime && r.timestamp < filter.startTime) return false;
          if (filter.endTime && r.timestamp > filter.endTime) return false;
          return true;
        });
      }

      // Sort by timestamp descending
      recordings.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit
      if (filter?.limit) {
        recordings = recordings.slice(0, filter.limit);
      }

      return recordings;
    } catch (error) {
      throw new Error(`Failed to list recordings: ${error}`);
    }
  }

  /**
   * Delete recording from filesystem.
   */
  async deleteRecording(id: string): Promise<void> {
    try {
      await this.initialize();

      if (!this.metadataCache) {
        throw new Error('Metadata cache not initialized');
      }

      const metadata = this.metadataCache.recordings[id];
      if (!metadata) {
        return;
      }

      // Delete the recording file
      try {
        const fileName = `${id}.${metadata.format}`;
        const filePath = `${RECORDINGS_DIR}/${fileName}`;

        await Filesystem.deleteFile({
          path: filePath,
          directory: Directory.Documents,
        });
      } catch {
        // File might not exist, continue with metadata cleanup
      }

      // Remove from metadata
      delete this.metadataCache.recordings[id];
      await this.saveMetadata();
    } catch (error) {
      throw new Error(`Failed to delete recording: ${error}`);
    }
  }

  /**
   * Get storage statistics.
   */
  async getStatistics(): Promise<{
    count: number;
    totalSize: number;
    oldestRecording?: number;
    newestRecording?: number;
  }> {
    try {
      await this.initialize();

      if (!this.metadataCache) {
        throw new Error('Metadata cache not initialized');
      }

      const recordings = Object.values(this.metadataCache.recordings);
      const stats = {
        count: recordings.length,
        totalSize: recordings.reduce((sum, r) => sum + (r.size || 0), 0),
        oldestRecording: undefined as number | undefined,
        newestRecording: undefined as number | undefined,
      };

      if (recordings.length > 0) {
        const timestamps = recordings.map((r) => r.timestamp);
        stats.oldestRecording = Math.min(...timestamps);
        stats.newestRecording = Math.max(...timestamps);
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error}`);
    }
  }

  /**
   * Clear all recordings from filesystem.
   */
  async clearAll(): Promise<void> {
    try {
      // Delete recordings directory
      await Filesystem.rmdir({
        path: RECORDINGS_DIR,
        directory: Directory.Documents,
        recursive: true,
      });

      // Recreate empty directory
      await Filesystem.mkdir({
        path: RECORDINGS_DIR,
        directory: Directory.Documents,
        recursive: true,
      });

      // Reset metadata
      this.metadataCache = {
        recordings: {},
        lastUpdated: Date.now(),
      };
      await this.saveMetadata();
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }
}
