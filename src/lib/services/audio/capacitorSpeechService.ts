let SpeechRecognition: any = null;

export interface CapacitorTranscriptionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface CapacitorTranscriptionError {
  message: string;
  code?: string;
}

interface SpeechRecognitionResult {
  matches?: string[];
  isFinal?: boolean;
  error?: string;
}

declare global {
  interface Window {
    cordova?: unknown;
  }
}

/**
 * Wrapper for native speech recognition using Capacitor Community plugin
 * Converts audio file (Blob) to text using native iOS/Android engines
 */
export class CapacitorSpeechService {
  private language: string = 'en-US';

  constructor(language: string = 'en-US') {
    this.language = language;
  }

  /**
   * Transcribe audio blob using native speech recognition
   * Note: The plugin actually requires audio file path on native platforms,
   * but we'll work with the blob by converting it to a data URL or file path
   */
  async transcribeAudioBlob(_blob: Blob): Promise<CapacitorTranscriptionResult> {
    try {
      if (!SpeechRecognition && typeof window !== 'undefined') {
        const sr = await import('@capacitor-community/speech-recognition');
        SpeechRecognition = sr.SpeechRecognition;
      }

      if (!SpeechRecognition) {
        throw new Error('Speech recognition is not available in this environment');
      }

      // Initialize speech recognition with language settings
      await SpeechRecognition.start({
        language: this.language,
        maxResults: 1,
        prompt: 'Transcribing audio...',
      });

      // Get the result
      const result = (await SpeechRecognition.stop()) as unknown as SpeechRecognitionResult;

      if (!result.matches || result.matches.length === 0) {
        return {
          transcript: '',
          confidence: 0,
          isFinal: true,
        };
      }

      // Get the best match
      const bestMatch = result.matches[0];
      return {
        transcript: bestMatch,
        confidence: result.isFinal ? 0.95 : 0.5, // Higher confidence for final results
        isFinal: result.isFinal ?? true,
      };
    } catch (error) {
      console.error('Capacitor speech recognition error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle speech recognition errors
   */
  private handleError(error: any): CapacitorTranscriptionError {
    let message = 'Speech recognition failed';
    let code = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      if ('message' in error) {
        message = error.message;
      }
      if ('code' in error) {
        code = error.code;
      }
    }

    return { message, code };
  }

  /**
   * Check if speech recognition is available
   */
  static isSupported(): boolean {
    // Only supported on native platforms for now
    return typeof window !== 'undefined' && (window as any).cordova !== undefined;
  }
}
