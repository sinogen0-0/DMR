/**
 * Shared type definitions for microphone permissions
 */
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface PermissionCheckResult {
  status: PermissionStatus;
  canRequest: boolean;
  reason?: string;
}

export interface PermissionRequestResult {
  granted: boolean;
  reason?: string;
}

/**
 * Capacitor-based microphone permission handler for iOS and Android
 * Note: Permission handling via native Capacitor plugins (iOS/Android specific)
 */
export class CapacitorPermissions {
/**
   * Check microphone permission using capacitor-voice-recorder plugin.
   */
  async checkMicrophoneStatus(): Promise<PermissionCheckResult> {
    try {
      const { VoiceRecorder } = await import('capacitor-voice-recorder');
      const result = await VoiceRecorder.hasAudioRecordingPermission();
      return {
        status: result.value ? 'granted' : 'prompt',
        canRequest: true,
      };
    } catch (error) {
      return { status: 'prompt', canRequest: true, reason: `Permission check failed: ${error}` };
    }
  }

  /**
   * Request microphone permission via capacitor-voice-recorder plugin.
   * On Android this shows the native RECORD_AUDIO dialog.
   */
  async requestMicrophone(): Promise<PermissionRequestResult> {
    try {
      const { VoiceRecorder } = await import('capacitor-voice-recorder');
      const result = await VoiceRecorder.requestAudioRecordingPermission();
      if (result.value) {
        return { granted: true };
      }
      return { granted: false, reason: 'Permission denied by user' };
    } catch (error) {
      return {
        granted: false,
        reason: `Permission request failed: ${error}`,
      };
    }
  }
}
