/**
 * Platform Detection Utility
 * Identifies the runtime environment: web, iOS, or Android
 */

export type Platform = 'web' | 'ios' | 'android';

interface PlatformInfo {
  platform: Platform;
  isWeb: boolean;
  isMobile: boolean;
  isNative: boolean;
  userAgent: string;
}

let cachedPlatform: Platform | null = null;

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
  if (cachedPlatform) return cachedPlatform;

  // Only runs in browser environment
  if (typeof window === 'undefined') {
    return 'web';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for Capacitor (native environment indicator)
  if ((window as any).Capacitor && (window as any).Capacitor.isWebView) {
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      cachedPlatform = 'ios';
    } else if (userAgent.includes('android')) {
      cachedPlatform = 'android';
    } else {
      cachedPlatform = 'web';
    }
  } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    cachedPlatform = 'ios';
  } else if (userAgent.includes('android')) {
    cachedPlatform = 'android';
  } else {
    cachedPlatform = 'web';
  }

  return cachedPlatform;
}

/**
 * Get complete platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const platform = detectPlatform();

  return {
    platform,
    isWeb: platform === 'web',
    isMobile: platform === 'ios' || platform === 'android',
    isNative: platform === 'ios' || platform === 'android',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  };
}

/**
 * Check if running on web
 */
export function isWeb(): boolean {
  return detectPlatform() === 'web';
}

/**
 * Check if running on mobile (iOS or Android)
 */
export function isMobile(): boolean {
  const platform = detectPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return detectPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return detectPlatform() === 'android';
}

/**
 * Check if Capacitor is available
 */
export function hasCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).Capacitor !== undefined;
}
