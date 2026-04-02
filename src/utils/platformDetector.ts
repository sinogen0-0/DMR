import { Capacitor } from '@capacitor/core';

/**
 * Detects the current platform the app is running on
 */
export function getPlatform(): 'web' | 'ios' | 'android' {
  if (!Capacitor || !Capacitor.isNativePlatform()) {
    return 'web';
  }
  
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') {
    return platform;
  }
  
  return 'web';
}

/**
 * Check if running on a native platform (iOS or Android)
 */
export function isNative(): boolean {
  if (!Capacitor) {
    return false;
  }
  return Capacitor.isNativePlatform();
}

/**
 * Check if running on web
 */
export function isWeb(): boolean {
  if (!Capacitor) {
    return true;
  }
  return !Capacitor.isNativePlatform();
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return getPlatform() === 'android';
}
