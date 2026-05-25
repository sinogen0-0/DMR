import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import type { Recording } from '$lib/types';
import { logDevice } from '$lib/utils/deviceLogger';

/**
 * Capacitor Filesystem-based storage for iOS and Android.
 * Stores recordings and metadata on device filesystem.
 * Maintains a metadata index stored in AppGroup/UserDefaults for quick access.
 */

const RECORDINGS_DIR = 'DungeonDeckRecorder/recordings';
const METADATA_FILE = 'DungeonDeckRecorder/metadata.json';
const STORAGE_DIRECTORY = Directory.Data;

async function writeFileWithFallback(path: string, data: string): Promise<Directory> {
  try {
    await Filesystem.writeFile({
      path,
      data,
      directory: STORAGE_DIRECTORY,
      recursive: true,
    });
    return STORAGE_DIRECTORY;
  } catch (error) {
    logDevice('FilesystemStorage', 'writeFile Data failed, retrying Documents', { path, error: String(error) }, 'warn');
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
    return Directory.Documents;
  }
}

type StoredRecordingMetadata = Omit<Recording, 'blob' | 'blobUrl'>;

interface StoredMetadata {
  recordings: Record<string, StoredRecordingMetadata>;
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
      try {
        await Filesystem.mkdir({
          path: RECORDINGS_DIR,
          directory: STORAGE_DIRECTORY,
          recursive: true,
        });
      } catch (error) {
        const message = String(error).toLowerCase();
        if (!message.includes('exists') && !message.includes('directory exists')) {
          throw error;
        }

        logDevice('FilesystemStorage', 'initialize(): recordings directory already exists');
      }

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
        directory: STORAGE_DIRECTORY,
        encoding: Encoding.UTF8,
      });

      const text = typeof result.data === 'string' ? result.data : new TextDecoder().decode((result.data as unknown) as Uint8Array);
      this.metadataCache = JSON.parse(text);
      logDevice('FilesystemStorage', 'loadMetadata() success', {
        count: Object.keys(this.metadataCache.recordings || {}).length,
      });
    } catch {
      // Metadata file doesn't exist yet, initialize empty and save it
      this.metadataCache = {
        recordings: {},
        lastUpdated: Date.now(),
      };
      logDevice('FilesystemStorage', 'loadMetadata() initialized empty metadata cache', undefined, 'warn');
      
      // Save the empty metadata file to ensure directory structure exists
      try {
        await Filesystem.writeFile({
          path: METADATA_FILE,
          data: JSON.stringify(this.metadataCache, null, 2),
          directory: STORAGE_DIRECTORY,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        logDevice('FilesystemStorage', 'loadMetadata() created initial metadata file');
      } catch (writeError) {
        logDevice('FilesystemStorage', 'loadMetadata() failed to create metadata file', { error: String(writeError) }, 'warn');
      }
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
        directory: STORAGE_DIRECTORY,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      logDevice('FilesystemStorage', 'saveMetadata() success', {
        count: Object.keys(this.metadataCache.recordings || {}).length,
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
      logDevice('FilesystemStorage', 'saveRecording() start', {
        id: recording.id,
        format: recording.format,
        size: recording.size,
        hasBlob: !!recording.blob,
        hasBlobUrl: !!recording.blobUrl,
      });
      await this.initialize();

      if (!this.metadataCache) {
        throw new Error('Metadata cache not initialized');
      }

      const fileName = `${recording.id}.${recording.format}`;
      const filePath = `${RECORDINGS_DIR}/${fileName}`;

      let sourceBlob: Blob | undefined = recording.blob;
      if (!sourceBlob && recording.blobUrl) {
        const response = await fetch(recording.blobUrl);
        sourceBlob = await response.blob();
      }

      if (!sourceBlob) {
        logDevice('FilesystemStorage', 'saveRecording() missing payload', { id: recording.id }, 'error');
        throw new Error('Recording has no audio payload (blob/blobUrl) to save');
      }

      const arrayBuffer = await sourceBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const base64String = btoa(binary);

      const writeDirectory = await writeFileWithFallback(filePath, base64String);

      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory: writeDirectory,
      });

      // Store only serializable metadata (exclude blob/blobUrl)
      const { blob, blobUrl, ...metadataWithoutBinary } = recording;
      const metadata: StoredRecordingMetadata = {
        ...metadataWithoutBinary,
        path: uriResult.uri,
      };

      this.metadataCache.recordings[recording.id] = metadata;
      await this.saveMetadata();
      logDevice('FilesystemStorage', 'saveRecording() complete', {
        id: recording.id,
        filePath,
        bytes: uint8Array.length,
        uri: uriResult.uri,
      });
    } catch (error) {
      logDevice('FilesystemStorage', 'saveRecording() failed', { error: String(error) }, 'error');
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
          directory: STORAGE_DIRECTORY,
        });

        return metadata;
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

      logDevice('FilesystemStorage', 'listRecordings() result', {
        count: recordings.length,
      });

      return recordings;
    } catch (error) {
      logDevice('FilesystemStorage', 'listRecordings() failed', { error: String(error) }, 'error');
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
          directory: STORAGE_DIRECTORY,
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
        directory: STORAGE_DIRECTORY,
        recursive: true,
      });

      // Recreate empty directory
      await Filesystem.mkdir({
        path: RECORDINGS_DIR,
        directory: STORAGE_DIRECTORY,
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
