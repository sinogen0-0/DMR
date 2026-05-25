/**
 * Audio Stream Receiver Service
 * Receives raw PCM audio chunks from native plugin and processes them
 * 
 * Architecture:
 * - Subscribes to native audioChunk events
 * - Decodes base64 PCM data
 * - Provides callbacks for application processing
 * - Manages stream lifecycle
 * 
 * Design Pattern: Observer pattern with typed callbacks
 */

import { AudioTranscriber } from 'capacitor-audio-transcriber';
import type { AudioChunkEvent, AudioErrorEvent, StreamingInfo, PluginListenerHandle } from 'capacitor-audio-transcriber';
import { logDevice } from '$lib/utils/deviceLogger';

/**
 * Decoded audio chunk with PCM data
 */
export interface ProcessedAudioChunk {
	/** Raw PCM audio samples (16-bit signed integers) */
	samples: Int16Array;
	
	/** Timestamp in milliseconds */
	timestamp: number;
	
	/** Sample rate in Hz */
	sampleRate: number;
	
	/** Duration of chunk in seconds */
	duration: number;
}

/**
 * Callback for processed audio chunks
 */
export type AudioChunkCallback = (chunk: ProcessedAudioChunk) => void;

/**
 * Callback for errors
 */
export type AudioErrorCallback = (error: string) => void;

/**
 * Audio stream receiver configuration
 */
export interface StreamReceiverOptions {
	/** Sample rate in Hz (default: 44100) */
	sampleRate?: number;
	
	/** Callback for audio chunks */
	onChunk?: AudioChunkCallback;
	
	/** Callback for errors */
	onError?: AudioErrorCallback;
}

/**
 * Audio stream receiver service
 * Manages native audio stream and delivers processed chunks
 */
export class AudioStreamReceiver {
	private chunkListener: PluginListenerHandle | null = null;
	private errorListener: PluginListenerHandle | null = null;
	private streamInfo: StreamingInfo | null = null;
	private isStreaming = false;
	
	private chunkCallback: AudioChunkCallback | null = null;
	private errorCallback: AudioErrorCallback | null = null;

	/**
	 * Start receiving audio stream
	 * @param options Stream configuration
	 */
	async start(options: StreamReceiverOptions = {}): Promise<StreamingInfo> {
		if (this.isStreaming) {
			throw new Error('Already streaming');
		}

		this.chunkCallback = options.onChunk || null;
		this.errorCallback = options.onError || null;

		try {
			// Register listeners
			this.chunkListener = await AudioTranscriber.addListener('audioChunk', (event) => {
				this.handleAudioChunk(event);
			});

			this.errorListener = await AudioTranscriber.addListener('audioError', (event) => {
				this.handleAudioError(event);
			});

			// Start native streaming
			this.streamInfo = await AudioTranscriber.startStreaming({
				sampleRate: options.sampleRate || 44100
			});

			this.isStreaming = true;

			logDevice('AudioStreamReceiver', 'Stream started', {
				sampleRate: this.streamInfo.sampleRate,
				channelCount: this.streamInfo.channelCount,
				bitDepth: this.streamInfo.bitDepth
			});

			return this.streamInfo;

		} catch (error) {
			await this.cleanup();
			throw new Error(`Failed to start audio stream: ${error}`);
		}
	}

	/**
	 * Stop receiving audio stream
	 * @returns Stream duration in milliseconds
	 */
	async stop(): Promise<number> {
		if (!this.isStreaming) {
			logDevice('AudioStreamReceiver', 'Not streaming, nothing to stop', undefined, 'warn');
			return 0;
		}

		try {
			const result = await AudioTranscriber.stopStreaming();
			logDevice('AudioStreamReceiver', 'Stream stopped', { duration: result.duration });
			return result.duration;

		} catch (error) {
			logDevice('AudioStreamReceiver', 'Error stopping stream', { error: String(error) }, 'error');
			throw error;

		} finally {
			await this.cleanup();
		}
	}

	/**
	 * Set chunk callback
	 */
	setChunkCallback(callback: AudioChunkCallback | null): void {
		this.chunkCallback = callback;
	}

	/**
	 * Set error callback
	 */
	setErrorCallback(callback: AudioErrorCallback | null): void {
		this.errorCallback = callback;
	}

	/**
	 * Get current streaming status
	 */
	getIsStreaming(): boolean {
		return this.isStreaming;
	}

	/**
	 * Get stream information
	 */
	getStreamInfo(): StreamingInfo | null {
		return this.streamInfo;
	}

	/**
	 * Handle audio chunk from native plugin
	 */
	private handleAudioChunk(event: AudioChunkEvent): void {
		if (!this.streamInfo) {
			logDevice('AudioStreamReceiver', 'Received chunk before stream info', undefined, 'error');
			return;
		}

		try {
			// Decode base64 PCM data
			const binaryString = atob(event.data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			// Convert bytes to Int16Array (16-bit PCM)
			const samples = new Int16Array(bytes.buffer);

			// Calculate chunk duration
			const duration = samples.length / this.streamInfo.sampleRate;

			const processedChunk: ProcessedAudioChunk = {
				samples,
				timestamp: event.timestamp,
				sampleRate: this.streamInfo.sampleRate,
				duration
			};

			// Deliver to callback
			if (this.chunkCallback) {
				this.chunkCallback(processedChunk);
			}

		} catch (error) {
			logDevice('AudioStreamReceiver', 'Error processing chunk', { error: String(error) }, 'error');
			if (this.errorCallback) {
				this.errorCallback(`Chunk processing error: ${error}`);
			}
		}
	}

	/**
	 * Handle audio error from native plugin
	 */
	private handleAudioError(event: AudioErrorEvent): void {
		logDevice('AudioStreamReceiver', 'Audio error', { error: event.error }, 'error');
		
		if (this.errorCallback) {
			this.errorCallback(event.error);
		}
	}

	/**
	 * Clean up resources
	 */
	private async cleanup(): Promise<void> {
		// Remove listeners
		if (this.chunkListener) {
			await this.chunkListener.remove();
			this.chunkListener = null;
		}

		if (this.errorListener) {
			await this.errorListener.remove();
			this.errorListener = null;
		}

		// Reset state
		this.isStreaming = false;
		this.streamInfo = null;
		this.chunkCallback = null;
		this.errorCallback = null;
	}
}

/**
 * Create a new audio stream receiver
 */
export function createAudioStreamReceiver(): AudioStreamReceiver {
	return new AudioStreamReceiver();
}
