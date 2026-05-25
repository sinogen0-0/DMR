import { VoiceRecorder } from 'capacitor-voice-recorder';
import type { Recording } from '$lib/types';
import { logDevice } from '$lib/utils/deviceLogger';

/**
 * Native audio recorder for Android and iOS using capacitor-voice-recorder.
 * Uses platform-native audio APIs (Android AudioRecord / iOS AVAudioRecorder).
 */

export class CapacitorAudioRecorder {
  private startTime: number = 0;
  private _state: 'inactive' | 'recording' | 'paused' = 'inactive';

  async start(): Promise<void> {
    try {
      logDevice('CapacitorAudioRecorder', 'start() called', {
        stateBefore: this._state,
      });
      const statusBefore = await VoiceRecorder.getCurrentStatus();
      logDevice('CapacitorAudioRecorder', 'native status before start', { status: statusBefore.status });

      this.startTime = Date.now();
      await VoiceRecorder.startRecording();
      this._state = 'recording';

      const statusAfter = await VoiceRecorder.getCurrentStatus();
      logDevice('CapacitorAudioRecorder', 'recording started', {
        stateAfter: this._state,
        nativeStatusAfter: statusAfter.status,
      });
    } catch (error) {
      this._state = 'inactive';
      logDevice('CapacitorAudioRecorder', 'start() failed', { error: String(error) }, 'error');
      throw new Error(`Failed to start native recording: ${error}`);
    }
  }

  pause(): void {
    VoiceRecorder.pauseRecording()
      .then(() => { this._state = 'paused'; })
      .catch((err) => console.error('[CapacitorAudioRecorder] Pause failed:', err));
  }

  resume(): void {
    VoiceRecorder.resumeRecording()
      .then(() => { this._state = 'recording'; })
      .catch((err) => console.error('[CapacitorAudioRecorder] Resume failed:', err));
  }

  async stop(): Promise<Recording> {
    try {
      logDevice('CapacitorAudioRecorder', 'stop() called', {
        stateBefore: this._state,
        elapsedSeconds: this.getElapsedTime(),
      });
      const result = await VoiceRecorder.stopRecording();
      this._state = 'inactive';

      const payload = result?.value ?? ({} as { recordDataBase64?: string; mimeType?: string; msDuration?: number });
      const rawBase64 = (payload.recordDataBase64 ?? '').replace(/^data:.*;base64,/, '');
      const safeMimeType = payload.mimeType || 'audio/aac';
      const durationMs = payload.msDuration ?? (Date.now() - this.startTime);

      if (!rawBase64) {
        logDevice('CapacitorAudioRecorder', 'empty native payload at stop', payload, 'error');
        throw new Error('Native stop returned empty audio payload');
      }

      const byteChars = atob(rawBase64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const audioBlob = new Blob([byteArray], { type: safeMimeType });
      const blobUrl = URL.createObjectURL(audioBlob);
      const duration = durationMs / 1000;
      const format: Recording['format'] =
        safeMimeType.includes('mp4') || safeMimeType.includes('aac') || safeMimeType.includes('m4a')
          ? 'm4a'
          : 'opus';

      logDevice('CapacitorAudioRecorder', 'recording stopped', {
        blobSize: audioBlob.size,
        duration,
        mimeType: safeMimeType,
      });

      return {
        id: `recording_${this.startTime}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: this.startTime,
        duration,
        format,
        size: audioBlob.size,
        blob: audioBlob,
        blobUrl,
      };
    } catch (error) {
      this._state = 'inactive';
      logDevice('CapacitorAudioRecorder', 'stop() failed', { error: String(error) }, 'error');
      throw new Error(`Failed to stop native recording: ${error}`);
    }
  }

  getState(): 'inactive' | 'recording' | 'paused' {
    return this._state;
  }

  getElapsedTime(): number {
    if (this._state === 'inactive' || !this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }
}
