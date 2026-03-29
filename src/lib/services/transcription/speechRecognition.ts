/**
 * Web Speech API Wrapper
 * Provides a cleaned interface for SpeechRecognition with event handling
 */

// Type declarations for Web Speech API
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  language: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionResultEvent) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionEvent {
  type: 'start' | 'result' | 'error' | 'end';
  transcript?: string;
  isFinal?: boolean;
  confidence?: number;
  error?: string;
}

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

/**
 * Wrapper around Web Speech API with unified interface
 */
export class SpeechRecognitionWrapper {
  private recognition: ISpeechRecognition | null = null;
  private isSupportedFlag: boolean = false;
  private isListening: boolean = false;
  private interimTranscript: string = '';
  private finalTranscript: string = '';
  private options: Required<SpeechRecognitionOptions>;
  private eventListeners: Map<string, Set<(event: SpeechRecognitionEvent) => void>> = new Map();

  constructor(options: SpeechRecognitionOptions = {}) {
    this.options = {
      language: options.language || 'en-US',
      continuous: options.continuous ?? false,
      interimResults: options.interimResults ?? true,
      maxAlternatives: options.maxAlternatives ?? 1,
    };

    // Check for Web Speech API support
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI();
      this.isSupportedFlag = true;
      this._setupEventHandlers();
    }
  }

  /**
   * Check if Web Speech API is supported
   */
  public isSupported(): boolean {
    return this.isSupportedFlag;
  }

  /**
   * Start listening to microphone input
   */
  public startListening(): void {
    if (!this.isSupported || !this.recognition) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    if (this.isListening) {
      return;
    }

    this.interimTranscript = '';
    this.finalTranscript = '';
    this.isListening = true;

    // Configure recognition settings
    this.recognition.language = this.options.language;
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.maxAlternatives = this.options.maxAlternatives;

    try {
      this.recognition.start();
      this._emit('start', {
        type: 'start',
        transcript: '',
      });
    } catch (e) {
      // Already listening, ignore error
      console.warn('SpeechRecognition already started');
    }
  }

  /**
   * Stop listening to microphone input
   */
  public stopListening(): void {
    if (!this.isSupported || !this.recognition) {
      return;
    }

    this.isListening = false;

    try {
      this.recognition.stop();
    } catch (e) {
      // Already stopped, ignore error
      console.warn('SpeechRecognition already stopped');
    }
  }

  /**
   * Abort transcription
   */
  public abort(): void {
    if (!this.isSupported || !this.recognition) {
      return;
    }

    this.isListening = false;
    this.interimTranscript = '';
    this.finalTranscript = '';

    try {
      this.recognition.abort();
    } catch (e) {
      console.warn('Error aborting SpeechRecognition:', e);
    }
  }

  /**
   * Get current transcript (interim + final)
   */
  public getTranscript(): string {
    return this.finalTranscript + this.interimTranscript;
  }

  /**
   * Get final transcript only
   */
  public getFinalTranscript(): string {
    return this.finalTranscript;
  }

  /**
   * Set language
   */
  public setLanguage(lang: string): void {
    this.options.language = lang;
    if (this.recognition) {
      this.recognition.language = lang;
    }
  }

  /**
   * Subscribe to events
   */
  public addEventListener(
    event: 'start' | 'result' | 'error' | 'end',
    listener: (event: SpeechRecognitionEvent) => void
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(listener);
    };
  }

  /**
   * Emit event to listeners
   */
  private _emit(event: string, data: SpeechRecognitionEvent): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          console.error(`Error in ${event} listener:`, e);
        }
      });
    }
  }

  /**
   * Setup native Web Speech API event handlers
   */
  private _setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this._emit('start', {
        type: 'start',
        transcript: '',
      });
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
          this._emit('result', {
            type: 'result',
            transcript: this.finalTranscript.trim(),
            isFinal: true,
            confidence,
          });
        } else {
          interim += transcript;
          this._emit('result', {
            type: 'result',
            transcript: (this.finalTranscript + interim).trim(),
            isFinal: false,
            confidence,
          });
        }
      }

      this.interimTranscript = interim;
    };

    this.recognition.onerror = (event: any) => {
      const errorMessage = this._errorCodeToString(event.error);
      this._emit('error', {
        type: 'error',
        error: errorMessage,
        transcript: this.getTranscript(),
      });
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this._emit('end', {
        type: 'end',
        transcript: this.finalTranscript.trim(),
        isFinal: true,
      });
    };
  }

  /**
   * Convert Web Speech API error codes to human-readable strings
   */
  private _errorCodeToString(errorCode: string): string {
    const errorMap: Record<string, string> = {
      'no-speech': 'No speech was detected. Please try again.',
      'audio-capture': 'No microphone was found. Ensure that the microphone is connected.',
      'not-allowed': 'Microphone permission was denied. Please allow access to the microphone.',
      'network': 'Network error occurred. Please check your internet connection.',
      'aborted': 'Speech recognition was aborted.',
    };

    return errorMap[errorCode] || `An error occurred: ${errorCode}`;
  }
}
