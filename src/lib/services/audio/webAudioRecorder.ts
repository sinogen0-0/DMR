import type { Recording } from '$lib/types';

/**
 * Web Audio API implementation for recording audio.
 * Uses MediaRecorder API with support for Opus codec.
 * Note: FLAC encoding requires additional library (e.g., flac.js or recorder.js)
 */

interface AudioRecorderConfig {
  mimeType?: string;
  audioBitsPerSecond?: number;
}

const DEFAULT_MIME_TYPE = 'audio/webm;codecs=opus';
const MIME_TYPE_FALLBACKS = [
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
];

/**
 * Get supported MIME type for recording
 */
function getSupportedMimeType(preferred?: string): string {
  // Guard against SSR - MediaRecorder is only available in browser
  if (typeof MediaRecorder === 'undefined') {
    return preferred || DEFAULT_MIME_TYPE;
  }

  if (preferred && MediaRecorder.isTypeSupported(preferred)) {
    return preferred;
  }

  if (MediaRecorder.isTypeSupported(DEFAULT_MIME_TYPE)) {
    return DEFAULT_MIME_TYPE;
  }

  for (const mimeType of MIME_TYPE_FALLBACKS) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  // Fallback to default if nothing else works
  return DEFAULT_MIME_TYPE;
}

export class WebAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPaused: boolean = false;
  private mimeType: string;
  private config: AudioRecorderConfig;
  private currentStream: MediaStream | null = null;

  constructor(config: AudioRecorderConfig = {}) {
    this.config = config;
    this.mimeType = getSupportedMimeType(config.mimeType);
  }

  /**
   * Request microphone permission and start recording
   */
  async start(): Promise<void> {
    try {
      console.log('[WebAudioRecorder] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Store stream for potential sharing with other services
      this.currentStream = stream;

      // Verify stream has active audio tracks
      const audioTracks = stream.getAudioTracks();
      console.log('[WebAudioRecorder] Audio tracks received:', audioTracks.length);
      
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks in stream');
      }

      audioTracks.forEach((track, index) => {
        console.log(`[WebAudioRecorder] Track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label,
          settings: track.getSettings?.()
        });
      });

      const options: MediaRecorderOptions = {
        mimeType: this.mimeType,
      };

      if (this.config.audioBitsPerSecond) {
        options.audioBitsPerSecond = this.config.audioBitsPerSecond;
      }

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.audioChunks = [];
      this.startTime = Date.now();
      this.isPaused = false;
      this.pauseTime = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('[WebAudioRecorder] Data chunk received:', event.data.size, 'bytes');
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[WebAudioRecorder] MediaRecorder error:', event);
      };

      console.log('[WebAudioRecorder] Starting MediaRecorder with:', options);
      // Request data chunks every 100ms for smooth capture
      this.mediaRecorder.start(100);
      console.log('[WebAudioRecorder] ✅ MediaRecorder started, state:', this.mediaRecorder.state);
    } catch (error) {
      console.error('[WebAudioRecorder] ❌ Failed to start:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied');
      }
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  /**
   * Pause recording (can be resumed)
   */
  pause(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      throw new Error('Recording not active');
    }

    if (!this.isPaused) {
      this.mediaRecorder.pause();
      this.pauseTime = Date.now() - this.startTime;
      this.isPaused = true;
    }
  }

  /**
   * Resume paused recording
   */
  resume(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      throw new Error('Recording not active');
    }

    if (this.isPaused) {
      this.mediaRecorder.resume();
      // Adjust start time to account for paused duration
      this.startTime = Date.now() - this.pauseTime;
      this.isPaused = false;
    }
  }

  /**
   * Stop recording and return Recording object
   */
  async stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Recording not active'));
        return;
      }

      console.log('[WebAudioRecorder] Stopping recording, state:', this.mediaRecorder.state);
      console.log('[WebAudioRecorder] Audio chunks collected:', this.audioChunks.length);

      this.mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mimeType,
          });

          const duration = (Date.now() - this.startTime) / 1000; // Convert to seconds
          const blobUrl = URL.createObjectURL(audioBlob);

          console.log('[WebAudioRecorder] Recording stopped:', {
            chunks: this.audioChunks.length,
            blobSize: audioBlob.size,
            duration,
            mimeType: this.mimeType
          });

          if (audioBlob.size === 0) {
            console.warn('[WebAudioRecorder] ⚠️ WARNING: Blob is empty! No audio data captured.');
          }

          // Stop all tracks to release microphone
          this.mediaRecorder!.stream.getTracks().forEach((track) => {
            console.log('[WebAudioRecorder] Stopping track:', track.label, track.readyState);
            track.stop();
          });

          // Clear the current stream reference
          this.currentStream = null;

          const recording: Recording = {
            id: `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: this.startTime,
            duration,
            format: 'opus', // Web recordings use Opus; will be converted to M4A if needed
            size: audioBlob.size,
            blob: audioBlob,
            blobUrl,
          };

          resolve(recording);
        } catch (error) {
          reject(new Error(`Failed to process recording: ${error}`));
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get current recording state
   */
  getState(): 'recording' | 'paused' | 'inactive' {
    if (!this.mediaRecorder) return 'inactive';
    if (this.mediaRecorder.state === 'paused') return 'paused';
    if (this.mediaRecorder.state === 'recording') return 'recording';
    return 'inactive';
  }

  /**
   * Get the current MediaStream (for sharing with other services like speech recognition)
   * @returns The active MediaStream or null if not recording
   */
  getStream(): MediaStream | null {
    return this.currentStream;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return 0;
    }
    return (Date.now() - this.startTime) / 1000;
  }
}
