import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Audio streaming plugin interface
 * Captures raw PCM audio and streams to JavaScript for offline processing
 * 
 * Architecture:
 * - Native captures ONE audio stream using AudioRecord
 * - Streams raw PCM chunks to JavaScript via events
 * - JavaScript processes stream for recording, transcription, etc.
 * - 100% offline, no network dependencies
 * 
 * Events:
 * - audioChunk: Fired when new audio data is available
 * - audioError: Fired when an error occurs
 */
export interface AudioTranscriberPlugin {
  /**
   * Start streaming raw audio data
   * @param options Streaming configuration
   * @returns Stream information (sample rate, channels, bit depth)
   */
  startStreaming(options?: StreamingOptions): Promise<StreamingInfo>;

  /**
   * Stop streaming audio data
   * @returns Streaming duration in milliseconds
   */
  stopStreaming(): Promise<StreamingResult>;

  /**
   * Listen for audio chunks
   * @param eventName Event name ('audioChunk')
   * @param listenerFunc Callback function to handle audio chunks
   * @returns Handle to remove the listener
   */
  addListener(
    eventName: 'audioChunk',
    listenerFunc: (event: AudioChunkEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Listen for audio errors
   * @param eventName Event name ('audioError')
   * @param listenerFunc Callback function to handle errors
   * @returns Handle to remove the listener
   */
  addListener(
    eventName: 'audioError',
    listenerFunc: (event: AudioErrorEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Remove all listeners for this plugin
   */
  removeAllListeners(): Promise<void>;
}

/**
 * Audio streaming configuration
 */
export interface StreamingOptions {
  /**
   * Sample rate in Hz
   * @default 44100
   */
  sampleRate?: number;
}

/**
 * Streaming start result
 */
export interface StreamingInfo {
  /**
   * Sample rate in Hz
   */
  sampleRate: number;

  /**
   * Number of audio channels (1 = mono, 2 = stereo)
   */
  channelCount: number;

  /**
   * Bit depth (16 for 16-bit PCM)
   */
  bitDepth: number;
}

/**
 * Streaming stop result
 */
export interface StreamingResult {
  /**
   * Total streaming duration in milliseconds
   */
  duration: number;
}

/**
 * Audio chunk event data
 */
export interface AudioChunkEvent {
  /**
   * Base64-encoded PCM audio data (16-bit signed little-endian integers)
   * Decode with atob() then convert to Int16Array for processing
   */
  data: string;

  /**
   * Timestamp in milliseconds since streaming started
   */
  timestamp: number;

  /**
   * Size of chunk in bytes
   */
  size: number;
}

/**
 * Audio error event data
 */
export interface AudioErrorEvent {
  /**
   * Error message
   */
  error: string;
}
