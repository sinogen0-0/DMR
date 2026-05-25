import { detectPlatform, isWeb, isMobile } from '$lib/utils/platformDetector';
import type { Recording } from '$lib/types';
import { WebAudioRecorder } from './audio/webAudioRecorder';
import { CapacitorAudioRecorder } from './audio/capacitorAudioRecorder';
import { NativeAudioStreamRecorderAdapter } from './audio/nativeAudioStreamRecorderAdapter';
import { createMicrophonePermission } from '$lib/features/audio/services/permissions/microphonePermission';

/**
 * Platform-agnostic audio recording service
 * Automatically selects:
 * - Android: Native audio streaming (AudioRecord → PCM chunks → WAV encoding, 100% offline)
 * - Web: Web Audio API
 * Provides unified interface for recording, pausing, resuming, and stopping
 */

type AudioRecorderImpl = WebAudioRecorder | CapacitorAudioRecorder | NativeAudioStreamRecorderAdapter;

interface AudioScaleConfig {
  mimeType?: string;
  audioBitsPerSecond?: number;
  recordingDirectory?: string;
  recordingQuality?: 'low' | 'medium' | 'high';
}

class AudioService {
  private recorder: AudioRecorderImpl | null = null;
  private platform: ReturnType<typeof detectPlatform>;
  private config: AudioScaleConfig;
  private permissionHandler = createMicrophonePermission();

  constructor(config: AudioScaleConfig = {}) {
    this.platform = detectPlatform();
    this.config = config;
    this.initializeRecorder();
  }

  /**
   * Initialize platform-specific recorder.
   * Android: Use native audio streaming (AudioRecord → PCM chunks → WAV encoding)
   * Web: Use Web Audio API
   */
  private initializeRecorder(): void {
    // Detect platform and use appropriate recorder
    if (this.platform === 'android') {
      // Use native audio streaming on Android
      // Single AudioRecord stream provides raw PCM chunks
      // Chunks are encoded to WAV in JavaScript layer
      // 100% offline, no network dependencies
      this.recorder = new NativeAudioStreamRecorderAdapter();
      console.log('[AudioService] Using native audio streaming for Android');
    } else {
      // Use Web Audio API for web and other platforms
      this.recorder = new WebAudioRecorder({
        mimeType: this.config.mimeType,
        audioBitsPerSecond: this.config.audioBitsPerSecond,
      });
      console.log('[AudioService] Using WebAudioRecorder for web platform');
    }
  }

  /**
   * Start recording audio from microphone
   * @throws {Error} If microphone permission is denied or recording fails
   */
  async startRecording(): Promise<void> {
    if (!this.recorder) {
      throw new Error('Audio recorder not initialized');
    }

    console.log('[AudioService] startRecording() called', {
      platform: this.platform,
      stateBefore: this.recorder.getState(),
    });

    if (this.recorder.getState() !== 'inactive') {
      throw new Error('Recording already in progress');
    }

    // Request microphone permission first
    const permissionResult = await this.permissionHandler.request();
    console.log('[AudioService] permission result:', permissionResult);
    if (!permissionResult.granted) {
      throw new Error(
        `Microphone permission required. ${permissionResult.reason || 'Permission denied by user.'}`
      );
    }

    try {
      await this.recorder.start();
      console.log('[AudioService] startRecording() completed', {
        stateAfter: this.recorder.getState(),
      });
    } catch (error) {
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  /**
   * Pause current recording (can be resumed)
   * @throws {Error} If no recording is active
   */
  pauseRecording(): void {
    if (!this.recorder) {
      throw new Error('Audio recorder not initialized');
    }

    if (this.recorder.getState() !== 'recording') {
      throw new Error('No active recording to pause');
    }

    this.recorder.pause();
  }

  /**
   * Resume paused recording
   * @throws {Error} If recording is not paused
   */
  resumeRecording(): void {
    if (!this.recorder) {
      throw new Error('Audio recorder not initialized');
    }

    if (this.recorder.getState() !== 'paused') {
      throw new Error('No paused recording to resume');
    }

    this.recorder.resume();
  }

  /**
   * Stop recording and return Recording object
   * @returns {Promise<Recording>} Recording object with blob, duration, and metadata
   * @throws {Error} If no recording is active
   */
  async stopRecording(): Promise<Recording> {
    if (!this.recorder) {
      throw new Error('Audio recorder not initialized');
    }

    const state = this.recorder.getState();
    console.log('[AudioService] stopRecording() called', {
      stateBefore: state,
      elapsedSeconds: this.recorder.getElapsedTime(),
    });
    if (state === 'inactive') {
      throw new Error('No active recording to stop');
    }

    try {
      const recording = await this.recorder.stop();
      console.log('[AudioService] stopRecording() completed', {
        id: recording.id,
        format: recording.format,
        size: recording.size,
        duration: recording.duration,
      });
      return recording;
    } catch (error) {
      throw new Error(`Failed to stop recording: ${error}`);
    }
  }

  /**
   * Get current recording state
   */
  getRecordingState(): 'recording' | 'paused' | 'inactive' {
    if (!this.recorder) {
      return 'inactive';
    }
    return this.recorder.getState();
  }

  /**
   * Get elapsed time of current recording in seconds
   */
  getElapsedTime(): number {
    if (!this.recorder) {
      return 0;
    }
    return this.recorder.getElapsedTime();
  }

  /**
   * Get current platform
   */
  getPlatform(): ReturnType<typeof detectPlatform> {
    return this.platform;
  }

  /**
   * Check if recording is supported on current platform
   */
  isSupported(): boolean {
    if (isWeb()) {
      return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    }
    return isMobile();
  }

  /**
   * Get supported audio formats for current platform
   */
  getSupportedFormats(): string[] {
    if (isWeb()) {
      return ['opus', 'mp3', 'wav', 'ogg'];
    }
    return ['m4a', 'aac', 'wav'];
  }

  /**
   * Check microphone permission status
   */
  async checkMicrophonePermission() {
    return await this.permissionHandler.checkStatus();
  }

  /**
   * Request microphone permission
   */
  async requestMicrophonePermission() {
    return await this.permissionHandler.request();
  }

  /**
   * Get permission status description for UI display
   */
  async getPermissionStatusDescription(): Promise<string> {
    return await this.permissionHandler.getStatusDescription();
  }

  /**
   * Get the current MediaStream for sharing with other services.
   * Returns null if not using WebAudioRecorder or if not recording.
   * This allows speech recognition to use the same mic stream.
   */
  getAudioStream(): MediaStream | null {
    if (this.recorder instanceof WebAudioRecorder) {
      return this.recorder.getStream();
    }
    return null;
  }
}

/**
 * Create new audio service instance
 */
export function createAudioService(config?: AudioScaleConfig): AudioService {
  return new AudioService(config);
}

export type { Recording } from '$lib/types';
