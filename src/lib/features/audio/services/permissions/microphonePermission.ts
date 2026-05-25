import { isWeb, isMobile } from '$lib/utils/platformDetector';
import { CapacitorPermissions, type PermissionStatus, type PermissionCheckResult, type PermissionRequestResult } from './capacitorPermissionHandler';

/**
 * Cross-platform microphone permission handling.
 * Abstracts Web Permissions API, iOS, and Android implementations.
 */

/**
 * Check microphone permission status on web using Permissions API
 */
async function checkWebMicrophonePermission(): Promise<PermissionCheckResult> {
  try {
    if (!navigator.permissions || !navigator.permissions.query) {
      console.log('[MicPermission] Permissions API not available, returning unknown');
      return {
        status: 'prompt',
        canRequest: !!navigator.mediaDevices?.getUserMedia,
        reason: 'Permissions API not available',
      };
    }

    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    console.log('[MicPermission] Permission query result:', result.state);
    return {
      status: result.state as PermissionStatus,
      canRequest: !!navigator.mediaDevices?.getUserMedia, // Always allow request on web if getUserMedia available
    };
  } catch (error) {
    console.warn('[MicPermission] Permission check failed, returning prompt:', error);
    return {
      status: 'prompt',
      canRequest: !!navigator.mediaDevices?.getUserMedia,
      reason: `Permission check failed: ${error}`,
    };
  }
}

/**
 * Request microphone permission on web
 */
async function requestWebMicrophonePermission(): Promise<PermissionRequestResult> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('[MicPermission] getUserMedia not available');
      return {
        granted: false,
        reason: 'getUserMedia API not available',
      };
    }

    console.log('[MicPermission] Requesting microphone access via getUserMedia...');
    // Attempt to get audio stream (this triggers permission prompt if needed)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    console.log('[MicPermission] Microphone access granted, stopping stream');
    // Stop all tracks to release the microphone
    stream.getTracks().forEach((track) => {
      track.stop();
    });

    return {
      granted: true,
    };
  } catch (error) {
    console.error('[MicPermission] Permission request failed:', error);
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return {
          granted: false,
          reason: 'User denied microphone permission',
        };
      }
      if (error.name === 'NotFoundError') {
        return {
          granted: false,
          reason: 'No microphone device found',
        };
      }
      if (error.name === 'SecurityError') {
        return {
          granted: false,
          reason: 'Microphone access not allowed in insecure context (must be HTTPS)',
        };
      }
    }
    return {
      granted: false,
      reason: `Permission request failed: ${error}`,
    };
  }
}

/**
 * Microphone permission handler - main public interface
 */
export class MicrophonePermission {
  private capacitorHandler: CapacitorPermissions | null = null;

  constructor() {
    if (isMobile()) {
      this.capacitorHandler = new CapacitorPermissions();
    }
  }

  /**
   * Check current microphone permission status
   */
  async checkStatus(): Promise<PermissionCheckResult> {
    try {
      if (isWeb()) {
        return await checkWebMicrophonePermission();
      } else if (isMobile() && this.capacitorHandler) {
        return await this.capacitorHandler.checkMicrophoneStatus();
      }

      return {
        status: 'unknown',
        canRequest: false,
        reason: 'Unsupported platform',
      };
    } catch (error) {
      return {
        status: 'unknown',
        canRequest: false,
        reason: `Status check error: ${error}`,
      };
    }
  }

  /**
   * Request microphone permission
   */
  async request(): Promise<PermissionRequestResult> {
    try {
      // Check current status first
      const status = await this.checkStatus();

      if (status.status === 'granted') {
        return {
          granted: true,
        };
      }

      if (!status.canRequest) {
        return {
          granted: false,
          reason: status.reason || 'Cannot request permission on this platform',
        };
      }

      // Request permission based on platform
      if (isWeb()) {
        return await requestWebMicrophonePermission();
      } else if (isMobile() && this.capacitorHandler) {
        return await this.capacitorHandler.requestMicrophone();
      }

      return {
        granted: false,
        reason: 'Unsupported platform',
      };
    } catch (error) {
      return {
        granted: false,
        reason: `Permission request error: ${error}`,
      };
    }
  }

  /**
   * Get human-readable status description
   */
  async getStatusDescription(): Promise<string> {
    const status = await this.checkStatus();

    switch (status.status) {
      case 'granted':
        return '✅ Microphone access granted';
      case 'denied':
        return '❌ Microphone access denied. Please change this in your device settings.';
      case 'prompt':
        return '❓ Microphone permission pending. Please allow access when prompted.';
      default:
        return '⚠️ Microphone permission status unknown';
    }
  }
}

/**
 * Factory function to create microphone permission handler
 */
export function createMicrophonePermission(): MicrophonePermission {
  return new MicrophonePermission();
}

// Re-export types for convenience (originally defined in capacitorPermissionHandler.ts)
export type { PermissionStatus, PermissionCheckResult, PermissionRequestResult } from './capacitorPermissionHandler';
