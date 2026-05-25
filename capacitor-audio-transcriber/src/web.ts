import { WebPlugin } from '@capacitor/core';

import type {
  AudioTranscriberPlugin,
  RecordingOptions,
  RecordingResult,
  TranscriptionOptions,
} from './definitions';

/**
 * Web implementation (stub/fallback)
 * For full web support, this should integrate with Web Audio API + Web Speech API
 */
export class AudioTranscriberWeb extends WebPlugin implements AudioTranscriberPlugin {
  async startRecording(_options?: RecordingOptions): Promise<{ sessionId: string }> {
    console.warn('AudioTranscriber.startRecording() not fully implemented for web');
    return { sessionId: `web-session-${Date.now()}` };
  }

  async stopRecording(): Promise<RecordingResult> {
    console.warn('AudioTranscriber.stopRecording() not fully implemented for web');
    return {
      filePath: '',
      duration: 0,
      size: 0,
      format: 'webm',
    };
  }

  async pauseRecording(): Promise<void> {
    console.warn('AudioTranscriber.pauseRecording() not implemented for web');
  }

  async resumeRecording(): Promise<void> {
    console.warn('AudioTranscriber.resumeRecording() not implemented for web');
  }

  async startTranscription(_options?: TranscriptionOptions): Promise<void> {
    console.warn('AudioTranscriber.startTranscription() not fully implemented for web');
  }

  async stopTranscription(): Promise<{ finalTranscript: string }> {
    console.warn('AudioTranscriber.stopTranscription() not fully implemented for web');
    return { finalTranscript: '' };
  }
}
