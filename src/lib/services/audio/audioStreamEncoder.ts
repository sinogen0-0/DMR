/**
 * Audio Stream Encoder
 * Receives PCM audio stream and encodes to WAV format
 * 
 * Architecture:
 * - Subscribes to AudioStreamReceiver
 * - Accumulates PCM samples
 * - Encodes to WAV file on stop
 * 
 * Design Pattern: Accumulator pattern with lazy encoding
 */

import type { ProcessedAudioChunk, AudioStreamReceiver } from './audioStreamReceiver';
import { logDevice } from '$lib/utils/deviceLogger';

/**
 * Encode PCM samples to WAV format
 * @param samples PCM samples (16-bit signed integers)
 * @param sampleRate Sample rate in Hz
 * @param channelCount Number of channels (1 = mono, 2 = stereo)
 * @returns WAV file as Blob
 */
function encodeWAV(samples: Int16Array, sampleRate: number, channelCount: number = 1): Blob {
	const bitDepth = 16;
	const bytesPerSample = bitDepth / 8;
	const blockAlign = channelCount * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = samples.length * bytesPerSample;
	const bufferSize = 44 + dataSize; // 44 bytes for WAV header
	
	const buffer = new ArrayBuffer(bufferSize);
	const view = new DataView(buffer);

	// WAV header
	let offset = 0;

	// "RIFF" chunk descriptor
	writeString(view, offset, 'RIFF'); offset += 4;
	view.setUint32(offset, bufferSize - 8, true); offset += 4; // File size - 8
	writeString(view, offset, 'WAVE'); offset += 4;

	// "fmt " sub-chunk
	writeString(view, offset, 'fmt '); offset += 4;
	view.setUint32(offset, 16, true); offset += 4; // fmt chunk size
	view.setUint16(offset, 1, true); offset += 2; // Audio format (1 = PCM)
	view.setUint16(offset, channelCount, true); offset += 2; // Number of channels
	view.setUint32(offset, sampleRate, true); offset += 4; // Sample rate
	view.setUint32(offset, byteRate, true); offset += 4; // Byte rate
	view.setUint16(offset, blockAlign, true); offset += 2; // Block align
	view.setUint16(offset, bitDepth, true); offset += 2; // Bits per sample

	// "data" sub-chunk
	writeString(view, offset, 'data'); offset += 4;
	view.setUint32(offset, dataSize, true); offset += 4;

	// Write PCM samples
	for (let i = 0; i < samples.length; i++) {
		view.setInt16(offset, samples[i], true);
		offset += 2;
	}

	return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
	for (let i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}

/**
 * Audio stream encoder configuration
 */
export interface StreamEncoderOptions {
	/** Sample rate in Hz (default: 44100) */
	sampleRate?: number;
	
	/** Maximum recording duration in seconds (default: unlimited) */
	maxDuration?: number;
}

/**
 * Audio stream encoder
 * Receives PCM stream and encodes to WAV file
 */
export class AudioStreamEncoder {
	private streamReceiver: AudioStreamReceiver;
	private accumulatedSamples: Int16Array[] = [];
	private sampleRate: number = 44100;
	private startTime: number = 0;
	private isRecording: boolean = false;

	constructor(streamReceiver: AudioStreamReceiver) {
		this.streamReceiver = streamReceiver;
	}

	/**
	 * Start recording from stream
	 */
	async start(options: StreamEncoderOptions = {}): Promise<void> {
		if (this.isRecording) {
			throw new Error('Already recording');
		}

		this.accumulatedSamples = [];
		this.sampleRate = options.sampleRate || 44100;
		this.startTime = Date.now();

		// Set chunk callback to accumulate samples
		this.streamReceiver.setChunkCallback((chunk) => {
			this.handleChunk(chunk);
		});

		// Start stream if not already streaming
		if (!this.streamReceiver.getIsStreaming()) {
			await this.streamReceiver.start({
				sampleRate: this.sampleRate,
				onError: (error) => {
					logDevice('AudioStreamEncoder', 'Stream error', { error }, 'error');
				}
			});
		}

		this.isRecording = true;

		logDevice('AudioStreamEncoder', 'Recording started', { sampleRate: this.sampleRate });
	}

	/**
	 * Stop recording and return WAV file
	 */
	async stop(): Promise<Blob> {
		if (!this.isRecording) {
			throw new Error('Not recording');
		}

		this.isRecording = false;

		// Clear chunk callback
		this.streamReceiver.setChunkCallback(null);

		// Concatenate all accumulated samples
		let totalLength = 0;
		for (const chunk of this.accumulatedSamples) {
			totalLength += chunk.length;
		}

		const allSamples = new Int16Array(totalLength);
		let offset = 0;
		for (const chunk of this.accumulatedSamples) {
			allSamples.set(chunk, offset);
			offset += chunk.length;
		}

		// Encode to WAV
		const wavBlob = encodeWAV(allSamples, this.sampleRate, 1);

		const duration = (Date.now() - this.startTime) / 1000;

		logDevice('AudioStreamEncoder', 'Recording stopped', {
			duration: duration.toFixed(2),
			samples: allSamples.length,
			size: wavBlob.size
		});

		// Clear accumulated samples
		this.accumulatedSamples = [];

		return wavBlob;
	}

	/**
	 * Get current recording state
	 */
	getIsRecording(): boolean {
		return this.isRecording;
	}

	/**
	 * Get elapsed recording time in seconds
	 */
	getElapsedTime(): number {
		if (!this.isRecording) {
			return 0;
		}
		return (Date.now() - this.startTime) / 1000;
	}

	/**
	 * Handle incoming audio chunk
	 */
	private handleChunk(chunk: ProcessedAudioChunk): void {
		if (!this.isRecording) {
			return;
		}

		// Accumulate samples
		this.accumulatedSamples.push(chunk.samples);
	}
}

/**
 * Create audio stream encoder
 */
export function createAudioStreamEncoder(streamReceiver: AudioStreamReceiver): AudioStreamEncoder {
	return new AudioStreamEncoder(streamReceiver);
}
