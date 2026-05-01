/**
 * Audio codec converter using FFmpeg WASM.
 * Converts FLAC → M4A (AAC), Opus → M4A, etc.
 * 
 * Note: FFmpeg WASM requires initialization on first use.
 * Large files (>50MB) may take a few seconds to convert.
 */

export interface ConversionOptions {
  inputFormat: 'flac' | 'opus' | 'wav' | 'ogg' | 'm4a';
  outputFormat: 'mp4' | 'aac' | 'm4a';
  bitrate?: string;
  onProgress?: (ratio: number) => void;
}

export interface ConversionResult {
  success: boolean;
  outputBlob?: Blob;
  error?: string;
  duration: number;
}

/**
 * Codec converter - placeholder implementation.
 * In production, this would use ffmpeg.wasm package (@ffmpeg/ffmpeg).
 * 
 * For MVP, we'll store the conversion as a simple pass-through or use
 * browser-native APIs where available.
 */
export class CodecConverter {
  private ffmpegReady = false;
  private ffmpeg: import('@ffmpeg/ffmpeg').FFmpeg | null = null;

  private getInputExtension(format: ConversionOptions['inputFormat']): string {
    switch (format) {
      case 'flac':
        return 'flac';
      case 'opus':
        return 'opus';
      case 'wav':
        return 'wav';
      case 'ogg':
        return 'ogg';
      case 'm4a':
        return 'm4a';
      default:
        return 'bin';
    }
  }

  private getOutputExtension(format: ConversionOptions['outputFormat']): string {
    switch (format) {
      case 'm4a':
        return 'm4a';
      case 'aac':
        return 'aac';
      case 'mp4':
        return 'mp4';
      default:
        return 'm4a';
    }
  }

  /**
   * Initialize FFmpeg WASM library (deferred until needed).
   * In browser environment, this loads the WASM binary and initializes it.
   */
  async initialize(): Promise<void> {
    if (this.ffmpegReady) return;

    try {
      if (typeof window === 'undefined') {
        throw new Error('FFmpeg conversion is only available in browser/WebView runtime');
      }

      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      const ffmpeg = new FFmpeg();

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.ffmpeg = ffmpeg;
      this.ffmpegReady = true;
    } catch (error) {
      throw new Error(`Failed to initialize FFmpeg: ${error}`);
    }
  }

  /**
   * Convert audio blob from one format to another.
   * 
   * @param inputBlob - Source audio blob (e.g., Opus from MediaRecorder)
   * @param options - Conversion options (input/output formats, bitrate)
   * @returns ConversionResult with converted blob or error
   */
  async convert(inputBlob: Blob, options: ConversionOptions): Promise<ConversionResult> {
    const startTime = performance.now();

    try {
      if (!this.isConversionSupported(options.inputFormat, options.outputFormat)) {
        return {
          success: false,
          error: `Conversion from ${options.inputFormat} to ${options.outputFormat} not supported`,
          duration: performance.now() - startTime,
        };
      }

      // Pass-through when source and destination are equivalent.
      if (options.inputFormat === options.outputFormat) {
        return {
          success: true,
          outputBlob: inputBlob,
          duration: performance.now() - startTime,
        };
      }

      await this.initialize();

      if (!this.ffmpeg) {
        throw new Error('FFmpeg is not initialized');
      }

      const inputExt = this.getInputExtension(options.inputFormat);
      const outputExt = this.getOutputExtension(options.outputFormat);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
      const inputName = `input-${unique}.${inputExt}`;
      const outputName = `output-${unique}.${outputExt}`;

      const { fetchFile } = await import('@ffmpeg/util');
      const inputData = await fetchFile(inputBlob);
      await this.ffmpeg.writeFile(inputName, inputData);

      if (options.onProgress) {
        this.ffmpeg.on('progress', ({ progress }) => {
          options.onProgress?.(progress);
        });
      }

      const bitrate = options.bitrate ?? '128k';
      const args = [
        '-i',
        inputName,
        '-c:a',
        'aac',
        '-b:a',
        bitrate,
        '-movflags',
        '+faststart',
        outputName,
      ];

      await this.ffmpeg.exec(args);

      const outputData = await this.ffmpeg.readFile(outputName);
      const typedArray = outputData as Uint8Array;
      const outputBytes = new Uint8Array(typedArray.byteLength);
      outputBytes.set(typedArray);

      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      const mimeType = options.outputFormat === 'aac' ? 'audio/aac' : 'audio/mp4';
      const outputBlob = new Blob([outputBytes.buffer], { type: mimeType });

      return {
        success: true,
        outputBlob,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      const message = String(error);
      const normalizedError = message.includes('not supported')
        ? 'Source format is not supported for conversion'
        : message.includes('initialize')
          ? 'FFmpeg initialization failed'
          : `Conversion failed: ${message}`;

      return {
        success: false,
        error: normalizedError,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Check if a conversion is supported.
   */
  isConversionSupported(
    inputFormat: string,
    outputFormat: string
  ): boolean {
    const supported: Record<string, string[]> = {
      flac: ['mp4', 'aac', 'm4a'],
      opus: ['mp4', 'aac', 'm4a'],
      wav: ['mp4', 'aac', 'm4a'],
      ogg: ['mp4', 'aac', 'm4a'],
      m4a: ['mp4', 'aac', 'm4a'],
    };

    return (supported[inputFormat] ?? []).includes(outputFormat);
  }

  /**
   * Get conversion recommendations based on platform and browser capabilities.
   */
  getRecommendedFormat(): 'm4a' | 'mp3' | 'aac' {
    // MVP: Return M4A as standard (AAC codec in MP4 container)
    // In production, could check browser capabilities
    return 'm4a';
  }
}
