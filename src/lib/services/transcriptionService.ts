/**
 * Transcription Service
 * Processes audio recordings using Web Speech API with storage integration
 */

import type { Recording } from '$types';
import { SpeechRecognitionWrapper, type SpeechRecognitionEvent } from './transcription/speechRecognition';

export interface TranscriptionOptions {
  language?: string;
  autoConvert?: boolean;
  continuous?: boolean;
}

export interface TranscriptionResult {
  recordingId: string;
  transcript: string;
  confidence: number;
  duration: number;
  language: string;
  startTime: number;
}

export interface TranscriptionSession {
  recordingId: string;
  isTranscribing: boolean;
  isFinal: boolean;
  transcript: string;
  confidence: number;
}

/**
 * Transcription Service
 * Provides high-level transcription API using Web Speech API
 */
class TranscriptionService {
  private recognition: SpeechRecognitionWrapper | null = null;
  private isSupportedFlag: boolean = false;
  private options: Required<TranscriptionOptions>;
  private currentSession: TranscriptionSession | null = null;
  private resultListeners: Set<(session: TranscriptionSession) => void> = new Set();
  private errorListeners: Set<(error: string) => void> = new Set();

  constructor(options: TranscriptionOptions = {}) {
    this.options = {
      language: options.language || 'en-US',
      autoConvert: options.autoConvert ?? true,
      continuous: options.continuous ?? false,
    };

    try {
      this.recognition = new SpeechRecognitionWrapper({
        language: this.options.language,
        continuous: this.options.continuous,
        interimResults: true,
      });

      this.isSupportedFlag = this.recognition.isSupported();
    } catch (e) {
      console.warn('Web Speech API initialization failed:', e);
      this.isSupportedFlag = false;
    }
  }

  /**
   * Check if Web Speech API is supported
   */
  public isSupported(): boolean {
    return this.isSupportedFlag;
  }

  /**
   * Get supported status message
   */
  public getSupportedMessage(): string {
    if (!this.isSupported) {
      return 'Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari for transcription.';
    }
    return 'Web Speech API is supported.';
  }

  /**
   * Transcribe audio using Web Speech API
   * NOTE: Web Speech API captures from microphone, not from audio blob
   * The blob parameter is for future use but not required for speech recognition
   */
  public async transcribeAudioBlob(
    recordingId: string,
    _audioBlob: Blob,
    recording: Recording
  ): Promise<TranscriptionResult> {
    if (!this.isSupported || !this.recognition) {
      throw new Error(this.getSupportedMessage());
    }

    // Initialize transcription session
    this.currentSession = {
      recordingId,
      isTranscribing: true,
      isFinal: false,
      transcript: '',
      confidence: 0,
    };

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech Recognition not initialized'));
        return;
      }

      let finalResult: TranscriptionResult | null = null;
      let selectedConfidence = 0;
      const startTime = Date.now();
      const recordingDuration = recording.duration || 30; // Default to 30 seconds if unknown

      // Setup event listeners
      const unsubscribeStart = this.recognition.addEventListener('start', () => {
        if (this.currentSession) {
          this.currentSession.isTranscribing = true;
          this._notifyResult();
        }
      });

      const unsubscribeResult = this.recognition.addEventListener(
        'result',
        (event: SpeechRecognitionEvent) => {
          if (this.currentSession && event.transcript) {
            this.currentSession.transcript = event.transcript;
            this.currentSession.isFinal = event.isFinal || false;
            this.currentSession.confidence = Math.round(
              (event.confidence || 0) * 100
            );
            this._notifyResult();

            if (event.isFinal) {
              selectedConfidence = event.confidence || 0;
            }
          }
        }
      );

      const unsubscribeError = this.recognition.addEventListener(
        'error',
        (event: SpeechRecognitionEvent) => {
          const errorMsg = event.error || 'Unknown error occurred during transcription';
          this._notifyError(errorMsg);
          unsubscribeStart();
          unsubscribeResult();
          unsubscribeError();
          unsubscribeEnd();
          reject(new Error(errorMsg));
        }
      );

      const unsubscribeEnd = this.recognition.addEventListener(
        'end',
        (event: SpeechRecognitionEvent) => {
          unsubscribeStart();
          unsubscribeResult();
          unsubscribeError();
          unsubscribeEnd();

          const finalTranscript = event.transcript || '';

          if (!finalTranscript) {
            const noSpeechError = 'No speech detected. Please try again.';
            this._notifyError(noSpeechError);
            reject(new Error(noSpeechError));
            return;
          }

          finalResult = {
            recordingId,
            transcript: finalTranscript,
            confidence: selectedConfidence,
            duration: recordingDuration,
            language: this.options.language,
            startTime,
          };

          if (this.currentSession) {
            this.currentSession.isTranscribing = false;
            this.currentSession.isFinal = true;
            this._notifyResult();
          }

          resolve(finalResult);
        }
      );

      // Start transcription
      try {
        this.recognition.startListening();
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Failed to start transcription';
        this._notifyError(error);
        unsubscribeStart();
        unsubscribeResult();
        unsubscribeError();
        unsubscribeEnd();
        reject(new Error(error));
      }
    });
  }

  /**
   * Set language for transcription
   */
  public setLanguage(language: string): void {
    this.options.language = language;
    if (this.recognition) {
      this.recognition.setLanguage(language);
    }
  }

  /**
   * Stop current transcription
   */
  public stopTranscription(): void {
    if (this.recognition) {
      this.recognition.stopListening();
    }
  }

  /**
   * Abort current transcription
   */
  public abortTranscription(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
    this.currentSession = null;
  }

  /**
   * Get current transcription session
   */
  public getCurrentSession(): TranscriptionSession | null {
    return this.currentSession;
  }

  /**
   * Subscribe to transcription result updates (interim and final)
   */
  public onResult(listener: (session: TranscriptionSession) => void): () => void {
    this.resultListeners.add(listener);
    return () => {
      this.resultListeners.delete(listener);
    };
  }

  /**
   * Subscribe to transcription errors
   */
  public onError(listener: (error: string) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Notify result listeners
   */
  private _notifyResult(): void {
    if (this.currentSession) {
      this.resultListeners.forEach((listener) => {
        try {
          listener(this.currentSession!);
        } catch (e) {
          console.error('Error in result listener:', e);
        }
      });
    }
  }

  /**
   * Notify error listeners
   */
  private _notifyError(error: string): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }
}

/**
 * Factory function to create a new transcription service instance
 */
export function createTranscriptionService(
  options?: TranscriptionOptions
): TranscriptionService {
  return new TranscriptionService(options);
}

export type { TranscriptionService };
