/**
 * Adapter for NativeAudioTranscriber to match AudioRecorder interface
 * Wraps the native plugin to provide compatible API with WebAudioRecorder/CapacitorAudioRecorder
 */

import { nativeAudioTranscriber, type RecordingResult as NativeRecordingResult } from '../nativeAudioTranscriber';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { Recording } from '$lib/types';

export class NativeAudioRecorderAdapter {
  private startTime: number = 0;
  private state: 'recording' | 'paused' | 'inactive' = 'inactive';
  private sessionId: string | null = null;

  /**
   * Start recording
   */
  async start(): Promise<void> {
    this.sessionId = await nativeAudioTranscriber.startRecording({
      sampleRate: 44100,
      bitRate: 128000
    });
    this.state = 'recording';
    this.startTime = Date.now();
  }

  /**
   * Pause recording
   */
  async pause(): Promise<void> {
    await nativeAudioTranscriber.pauseRecording();
    this.state = 'paused';
  }

  /**
   * Resume recording
   */
  async resume(): Promise<void> {
    await nativeAudioTranscriber.resumeRecording();
    this.state = 'recording';
  }

  /**
   * Stop recording and convert to Recording type
   */
  async stop(): Promise<Recording> {
    const result: NativeRecordingResult = await nativeAudioTranscriber.stopRecording();
    this.state = 'inactive';
    
    const recordingId = this.sessionId || `recording-${Date.now()}`;
    this.sessionId = null;

    // Read the native file and convert to Blob
    // The filePath from native plugin is an absolute file path
    const fileUri = `file://${result.filePath}`;
    
    try {
      // Extract filename from absolute path (e.g., /data/.../cache/recording_123.m4a -> recording_123.m4a)
      const fileName = result.filePath.split('/').pop() || '';
      
      // Read file as base64 from cache directory
      const fileData = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Cache
      });

      // Convert base64 to Blob
      const base64Data = typeof fileData.data === 'string' ? fileData.data : fileData.data;
      const byteCharacters = atob(base64Data as string);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `audio/${result.format}` });
      
      // Create blob URL for playback
      const blobUrl = URL.createObjectURL(blob);

      const recording: Recording = {
        id: recordingId,
        blob,
        blobUrl,
        filePath: result.filePath,
        duration: result.duration,
        size: result.size,
        format: result.format,
        createdAt: new Date(),
        mimeType: `audio/${result.format}`
      };

      return recording;
    } catch (error) {
      console.error('[NativeAudioRecorderAdapter] Failed to read recording file:', error);
      throw new Error(`Failed to load recording from ${result.filePath}: ${error}`);
    }
  }

  /**
   * Get current state
   */
  getState(): 'recording' | 'paused' | 'inactive' {
    return this.state;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    if (this.state === 'inactive') {
      return 0;
    }
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Get audio stream (not available for native recorder)
   */
  getStream(): MediaStream | null {
    return null;
  }
}

export function createNativeAudioRecorderAdapter(): NativeAudioRecorderAdapter {
  return new NativeAudioRecorderAdapter();
}
