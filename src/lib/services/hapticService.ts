/**
 * Haptic Feedback Service
 * Provides tactile feedback for button presses and interactions
 * Uses Capacitor Haptics on mobile, fallback to Vibration API on web
 */

import { Capacitor } from '@capacitor/core';

// Type definitions for haptic styles
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

class HapticService {
  private enabled: boolean = true;
  private isNative: boolean = Capacitor.isNativePlatform();

  /**
   * Trigger haptic feedback
   */
  async trigger(style: HapticStyle = 'medium'): Promise<void> {
    if (!this.enabled) return;

    if (this.isNative) {
      await this.triggerNative(style);
    } else {
      await this.triggerWeb(style);
    }
  }

  /**
   * Trigger haptic using Capacitor Haptics (iOS/Android)
   */
  private async triggerNative(style: HapticStyle): Promise<void> {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

      switch (style) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'selection':
          await Haptics.selectionStart();
          await Haptics.selectionChanged();
          await Haptics.selectionEnd();
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
      }
    } catch (error) {
      console.warn('[HapticService] Native haptics failed:', error);
    }
  }

  /**
   * Trigger haptic using Vibration API (web fallback)
   */
  private async triggerWeb(style: HapticStyle): Promise<void> {
    if (!('vibrate' in navigator)) return;

    try {
      const patterns: Record<HapticStyle, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 40,
        selection: [5, 10, 5],
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [50, 100, 50, 100, 50],
      };

      const pattern = patterns[style];
      if (Array.isArray(pattern)) {
        navigator.vibrate(pattern);
      } else {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.warn('[HapticService] Web vibration failed:', error);
    }
  }

  /**
   * Trigger haptic for button press
   */
  async buttonPress(type: 'nav' | 'action' | 'toggle' = 'nav'): Promise<void> {
    const styleMap: Record<string, HapticStyle> = {
      nav: 'heavy',      // Navigation buttons feel chunky
      action: 'medium',  // Action buttons
      toggle: 'light',   // Toggle switches
    };
    await this.trigger(styleMap[type]);
  }

  /**
   * Enable/disable haptics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Singleton instance
export const hapticService = new HapticService();
