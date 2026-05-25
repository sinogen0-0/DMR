/**
 * Native Audio Stream Recorder Adapter
 * Adapts streaming audio architecture to AudioRecorder interface
 * 
 * Architecture:
 * - Uses AudioStreamReceiver to get raw PCM chunks
 * - Uses AudioStreamEncoder to accumulate and encode to WAV
 * - Implements AudioRecorder interface for compatibility
 * - Single audio stream shared between recording and transcription
 * 
 * Design Pattern: Adapter pattern for interface compatibility
 */

import type { AudioRecorder, AudioState } from '../audioRecorder';
import { AudioStreamReceiver } from './audioStreamReceiver';
import { AudioStreamEncoder } from './audioStreamEncoder';
import { logDevice } from '$lib/utils/deviceLogger';

/**
 * Native audio stream recorder adapter
 * Implements AudioRecorder using streaming architecture
 */
export class NativeAudioStreamRecorderAdapter implements AudioRecorder {
	private streamReceiver: AudioStreamReceiver;
	private streamEncoder: AudioStreamEncoder;
	private state: AudioState = 'inactive';
	private recordedBlob: Blob | null = null;
	private blobUrl: string | null = null;

	constructor() {
		this.streamReceiver = new AudioStreamReceiver();
		this.streamEncoder = new AudioStreamEncoder(this.streamReceiver);
	}

	/**
	 * Start recording
	 */
	async start(): Promise<void> {
		if (this.state !== 'inactive') {
			throw new Error('Recorder is already active');
		}

		try {
			// Clean up previous recording
			this.cleanup();

			// Start encoder (will start stream receiver if needed)
			await this.streamEncoder.start({
				sampleRate: 44100
			});

			this.state = 'recording';

			logDevice('NativeAudioStreamRecorderAdapter', 'Recording started');

		} catch (error) {
			logDevice('NativeAudioStreamRecorderAdapter', 'Failed to start', { error: String(error) }, 'error');
			this.state = 'inactive';
			throw error;
		}
	}

	/**
	 * Stop recording and return audio blob
	 */
	async stop(): Promise<Blob> {
		if (this.state !== 'recording' && this.state !== 'paused') {
			throw new Error('Recorder is not active');
		}

		try {
			// Stop encoder and get WAV blob
			this.recordedBlob = await this.streamEncoder.stop();

			// Stop stream receiver
			await this.streamReceiver.stop();

			// Create blob URL for playback
			if (this.blobUrl) {
				URL.revokeObjectURL(this.blobUrl);
			}
			this.blobUrl = URL.createObjectURL(this.recordedBlob);

			this.state = 'inactive';

			logDevice('NativeAudioStreamRecorderAdapter', 'Recording stopped', {
				size: this.recordedBlob.size,
				type: this.recordedBlob.type
			});

			return this.recordedBlob;

		} catch (error) {
			logDevice('NativeAudioStreamRecorderAdapter', 'Failed to stop', { error: String(error) }, 'error');
			this.state = 'inactive';
			throw error;
		}
	}

	/**
	 * Pause recording (not supported in streaming mode)
	 */
	async pause(): Promise<void> {
		// Streaming architecture doesn't support pause/resume
		// Could be implemented by buffering chunks but not needed for MVP
		logDevice('NativeAudioStreamRecorderAdapter', 'Pause not supported in streaming mode', undefined, 'warn');
		throw new Error('Pause not supported in streaming mode');
	}

	/**
	 * Resume recording (not supported in streaming mode)
	 */
	async resume(): Promise<void> {
		logDevice('NativeAudioStreamRecorderAdapter', 'Resume not supported in streaming mode', undefined, 'warn');
		throw new Error('Resume not supported in streaming mode');
	}

	/**
	 * Get current recorder state
	 */
	getState(): AudioState {
		return this.state;
	}

	/**
	 * Get elapsed recording time in seconds
	 */
	getElapsedTime(): number {
		return this.streamEncoder.getElapsedTime();
	}

	/**
	 * Get media stream (returns null for native recorder)
	 */
	getStream(): MediaStream | null {
		// Native recorder doesn't provide MediaStream
		// Stream is handled at native layer
		return null;
	}

	/**
	 * Get stream receiver for direct access to PCM chunks
	 * Allows transcription service to tap into the same stream
	 */
	getStreamReceiver(): AudioStreamReceiver {
		return this.streamReceiver;
	}

	/**
	 * Clean up resources
	 */
	private cleanup(): void {
		if (this.recordedBlob) {
			this.recordedBlob = null;
		}
		if (this.blobUrl) {
			URL.revokeObjectURL(this.blobUrl);
			this.blobUrl = null;
		}
	}
}
