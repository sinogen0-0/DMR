/**
 * Sound Service
 * Provides button click sounds and audio feedback
 * Uses Web Audio API to generate simple tones
 */

class SoundService {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Play a button click sound (short beep)
   * Frequency varies based on button type for different feel
   */
  playButtonClick(type: 'nav' | 'action' | 'toggle' = 'nav'): void {
    if (!this.enabled || !this.audioContext) return;

    const frequency = {
      nav: 800,      // Navigation buttons (REC/DOSSIER/ASK)
      action: 600,   // Action buttons (record, pause, stop)
      toggle: 1000,  // Toggle/switch buttons
    }[type];

    const duration = 0.05; // 50ms
    const now = this.audioContext.currentTime;

    // Create oscillator for the beep
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Configure oscillator
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Envelope (quick attack, quick release)
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01); // Attack
    gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release

    // Play
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Play a low "thunk" sound for pressing physical buttons
   */
  playThunk(): void {
    if (!this.enabled || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const duration = 0.08;

    // Create a low-frequency thunk
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Configure
    oscillator.frequency.value = 120; // Low frequency
    oscillator.type = 'square';
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    // Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Play a confirmation beep (two-tone)
   */
  playConfirm(): void {
    if (!this.enabled || !this.audioContext) return;

    setTimeout(() => this.playButtonClick('nav'), 0);
    setTimeout(() => this.playButtonClick('toggle'), 80);
  }

  /**
   * Play an error sound (low buzz)
   */
  playError(): void {
    if (!this.enabled || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const duration = 0.2;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Enable/disable sound effects
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Resume audio context (required after user interaction on some browsers)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

// Singleton instance
export const soundService = new SoundService();
