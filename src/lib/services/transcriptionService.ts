/**
 * Transcription Service
 * Processes audio recordings using Web Speech API with storage integration
 * 
 * Note: Native streaming transcription on Android is not yet implemented.
 * Audio stream is available via AudioStreamReceiver for integration with offline ML models.
 */

import type { Recording } from '$types';
import { SpeechRecognitionWrapper, type SpeechRecognitionEvent } from './transcription/speechRecognition';
import { isNative, detectPlatform } from '$lib/utils/platformDetector';
import { logDevice } from '$lib/utils/deviceLogger';

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
      continuous: options.continuous ?? true,
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
    if (isNative()) {
      return true;
    }
    return this.isSupportedFlag;
  }

  /**
   * Get supported status message
   */
  public getSupportedMessage(): string {
    if (isNative()) {
      return 'Native speech recognition is available.';
    }
    if (!this.isSupported()) {
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
    if (!this.isSupported() || !this.recognition) {
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

          const finalResult: TranscriptionResult = {
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
   * Start live transcription with callback for real-time updates
   * @param onUpdate Callback function that receives text and confidence updates
   */
  public async startTranscription(
    onUpdate: (result: { text: string; confidence: number; isFinal: boolean }) => void
  ): Promise<void> {
    // TODO: Integrate with AudioStreamReceiver for streaming transcription on Android
    // The audio stream from AudioStreamReceiver can be fed to the offline ML model
    const platform = detectPlatform();
    if (platform === 'android') {
      throw new Error('Native streaming transcription not yet implemented. Audio stream is available via AudioStreamReceiver.');
    }

    if (!this.isSupported() || !this.recognition) {
      throw new Error(this.getSupportedMessage());
    }

    // Initialize session
    this.currentSession = {
      recordingId: `live-${Date.now()}`,
      isTranscribing: true,
      isFinal: false,
      transcript: '',
      confidence: 0,
    };

    // Subscribe to aggregated session updates
    const unsubscribeSession = this.onResult((session) => {
      onUpdate({
        text: session.transcript,
        confidence: session.confidence,
        isFinal: session.isFinal,
      });
    });

    // Wire recognition events to current session for live mode.
    const unsubscribeResult = this.recognition.addEventListener(
      'result',
      (event: SpeechRecognitionEvent) => {
        console.log('[TranscriptionService] web speech result event', {
          hasSession: !!this.currentSession,
          eventType: event.type,
          transcript: event.transcript,
          transcriptLength: event.transcript?.length || 0,
          isFinal: event.isFinal,
          confidence: event.confidence,
        });
        
        if (!this.currentSession || !event.transcript) {
          console.warn('[TranscriptionService] result event skipped', {
            hasSession: !!this.currentSession,
            hasTranscript: !!event.transcript,
            transcript: event.transcript,
          });
          return;
        }

        this.currentSession.transcript = event.transcript;
        this.currentSession.confidence = Math.round((event.confidence || 0) * 100);
        this.currentSession.isFinal = event.isFinal || false;
        
        console.log('[TranscriptionService] session updated', {
          transcript: this.currentSession.transcript,
          transcriptLength: this.currentSession.transcript.length,
          confidence: this.currentSession.confidence,
          isFinal: this.currentSession.isFinal,
        });
        
        this._notifyResult();
      }
    );

    const unsubscribeError = this.recognition.addEventListener(
      'error',
      (event: SpeechRecognitionEvent) => {
        const errorMsg = event.error || 'Unknown transcription error';
        console.error('[TranscriptionService] web speech error', {
          error: errorMsg,
          event: event,
        });
        this._notifyError(errorMsg);
      }
    );

    const unsubscribeEnd = this.recognition.addEventListener('end', () => {
      console.log('[TranscriptionService] web speech ended', {
        hasSession: !!this.currentSession,
        sessionTranscript: this.currentSession?.transcript,
        isTranscribing: this.currentSession?.isTranscribing,
      });
      
      // Auto-restart if session is still active (Android WebView doesn't respect continuous:true)
      if (this.currentSession && this.currentSession.isTranscribing && this.recognition) {
        console.log('[TranscriptionService] auto-restarting web speech (continuous mode workaround)');
        try {
          setTimeout(() => {
            if (this.currentSession && this.currentSession.isTranscribing && this.recognition) {
              this.recognition.startListening();
              console.log('[TranscriptionService] web speech restarted');
            }
          }, 100); // Small delay to prevent immediate restart issues
        } catch (error) {
          console.error('[TranscriptionService] failed to restart web speech', error);
        }
      } else if (this.currentSession) {
        this.currentSession.isTranscribing = false;
        this.currentSession.isFinal = true;
        this._notifyResult();
      }
    });

    // Store combined cleanup function for stopTranscription().
    (this as any)._currentUnsubscribe = () => {
      console.log('[TranscriptionService] cleaning up web speech listeners');
      unsubscribeSession();
      unsubscribeResult();
      unsubscribeError();
      unsubscribeEnd();
    };

    // Start listening
    try {
      console.log('[TranscriptionService] starting web speech recognition', {
        language: this.options.language,
        continuous: this.options.continuous,
        isSupported: this.isSupported(),
      });
      this.recognition.startListening();
      console.log('[TranscriptionService] web speech recognition started successfully');
    } catch (error) {
      console.error('[TranscriptionService] failed to start web speech', error);
      unsubscribeSession();
      unsubscribeResult();
      unsubscribeError();
      unsubscribeEnd();
      throw error;
    }
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
  public async stopTranscription(): Promise<void> {
    const platform = detectPlatform();
    if (platform === 'android') {
      // TODO: Stop streaming transcription when implemented
      logDevice('TranscriptionService', 'Android transcription stop (not yet implemented)');
      return;
    }

    // Mark session as not transcribing BEFORE stopping to prevent auto-restart
    if (this.currentSession) {
      this.currentSession.isTranscribing = false;
      console.log('[TranscriptionService] session marked as not transcribing (intentional stop)');
    }

    if (this.recognition) {
      this.recognition.stopListening();
    }

    // Clean up subscription
    const unsubscribe = (this as any)._currentUnsubscribe;
    if (unsubscribe) {
      unsubscribe();
      (this as any)._currentUnsubscribe = null;
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
      logDevice('TranscriptionService', '_notifyResult called', {
        listenerCount: this.resultListeners.size,
        hasTranscript: !!this.currentSession.transcript,
        transcriptLength: this.currentSession.transcript.length,
        transcriptPreview: this.currentSession.transcript.slice(0, 60),
        confidence: this.currentSession.confidence,
        isFinal: this.currentSession.isFinal,
        isTranscribing: this.currentSession.isTranscribing,
      });
      
      let listenerIndex = 0;
      this.resultListeners.forEach((listener) => {
        listenerIndex++;
        try {
          logDevice('TranscriptionService', `calling listener ${listenerIndex}/${this.resultListeners.size}`);
          listener(this.currentSession!);
          logDevice('TranscriptionService', `listener ${listenerIndex} completed`);
        } catch (e) {
          console.error('Error in result listener:', e);
          logDevice('TranscriptionService', `listener ${listenerIndex} threw error`, { error: String(e) }, 'error');
        }
      });
    } else {
      logDevice('TranscriptionService', '_notifyResult called but no currentSession', {}, 'warn');
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
