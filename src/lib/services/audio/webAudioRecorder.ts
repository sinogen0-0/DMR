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

  constructor(config: AudioRecorderConfig = {}) {
    this.config = config;
    this.mimeType = getSupportedMimeType(config.mimeType);
  }

  /**
   * Request microphone permission and start recording
   */
  async start(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
    } catch (error) {
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

      this.mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mimeType,
          });

          const duration = (Date.now() - this.startTime) / 1000; // Convert to seconds
          const blobUrl = URL.createObjectURL(audioBlob);

          // Stop all tracks to release microphone
          this.mediaRecorder!.stream.getTracks().forEach((track) => {
            track.stop();
          });

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
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return 0;
    }
    return (Date.now() - this.startTime) / 1000;
  }
}
