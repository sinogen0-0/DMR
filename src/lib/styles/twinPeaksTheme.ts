/**
 * Twin Peaks Tape Deck Theme Configuration
 * CRT Oscilloscope aesthetic with physical device controls
 * Optimized for 480x854 portrait display
 */

export const theme = {
  // Display dimensions (portrait orientation)
  display: {
    width: 480,
    height: 854,
    aspectRatio: '480/854',
  },

  // CRT Oscilloscope colors (green phosphor)
  colors: {
    // Primary phosphor green
    phosphorGreen: '#00ff41',
    phosphorGreenDim: '#00cc33',
    phosphorGreenBright: '#66ff88',
    phosphorGlow: 'rgba(0, 255, 65, 0.5)',
    
    // CRT background
    crtBackground: '#001a0d',
    crtBackgroundLight: '#002611',
    
    // Device housing
    deviceBackground: '#1a1a1a',
    devicePanel: '#2a2a2a',
    metalDark: '#0f0f0f',
    
    // Physical button colors
    buttonDefault: '#3a3a3a',
    buttonPressed: '#1a1a1a',
    buttonHighlight: '#505050',
    buttonShadow: '#0a0a0a',
    
    // Special buttons
    recordButton: '#ff4400',
    recordButtonPressed: '#cc3300',
    recordButtonGlow: 'rgba(255, 68, 0, 0.6)',
    
    pauseButton: '#ffaa00',
    pauseButtonPressed: '#cc8800',
    
    stopButton: '#2a2a2a',
    stopButtonPressed: '#1a1a1a',
    
    // Status indicators
    ledActive: '#ff0000',
    ledInactive: '#330000',
    ledReady: '#00ff41',
    ledWarning: '#ffaa00',
    
    // Text colors
    textPrimary: '#00ff41',
    textSecondary: '#00cc33',
    textDim: '#008822',
    textHighlight: '#66ff88',
    textError: '#ff4400',
  },

  // Typography
  typography: {
    // CRT display fonts (monospace for vector look)
    displayFont: '"Courier New", "Consolas", "Monaco", monospace',
    displayFontWeight: 500,
    
    // UI labels
    labelFont: '"Space Grotesk", "Arial Narrow", sans-serif',
    labelFontWeight: 600,
    
    // Sizes
    displayLarge: '2rem',      // Titles on oscilloscope
    displayMedium: '1.2rem',   // Main content
    displaySmall: '0.9rem',    // Secondary info
    displayTiny: '0.75rem',    // Timestamps, metadata
    
    labelLarge: '0.8rem',      // Button labels
    labelSmall: '0.65rem',     // Fine print
    
    // Letter spacing for vector effect
    letterSpacingWide: '0.1em',
    letterSpacingNormal: '0.05em',
  },

  // Spacing scale (8px base)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem',     // 48px
  },

  // Border radius for physical elements
  radius: {
    none: '0',
    button: '4px',
    panel: '8px',
    display: '12px',
  },

  // Shadows for depth effect
  shadows: {
    // Button states
    buttonUp: `
      0 4px 0 0 #0a0a0a,
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `,
    buttonDown: `
      inset 0 2px 4px rgba(0, 0, 0, 0.5),
      inset 0 1px 2px rgba(0, 0, 0, 0.3)
    `,
    buttonHover: `
      0 5px 0 0 #0a0a0a,
      0 5px 12px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.15)
    `,
    
    // Panel depth
    panelInset: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)',
    panelRaised: '0 2px 8px rgba(0, 0, 0, 0.3)',
    
    // CRT glow effect
    crtGlow: `
      0 0 20px rgba(0, 255, 65, 0.3),
      inset 0 0 40px rgba(0, 255, 65, 0.1)
    `,
    
    // Text glow (for oscilloscope effect)
    textGlow: `
      0 0 4px rgba(0, 255, 65, 0.8),
      0 0 8px rgba(0, 255, 65, 0.4)
    `,
    textGlowStrong: `
      0 0 6px rgba(0, 255, 65, 1),
      0 0 12px rgba(0, 255, 65, 0.6),
      0 0 20px rgba(0, 255, 65, 0.3)
    `,
  },

  // Animation timing
  timing: {
    buttonPress: '100ms',
    scanLine: '8s',
    flicker: '0.15s',
    textCursor: '1s',
    fadeIn: '300ms',
    slideIn: '400ms',
  },

  // Easing functions
  easing: {
    buttonPress: 'cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.6, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Z-index layers
  zIndex: {
    base: 0,
    controls: 10,
    panel: 20,
    modal: 30,
    overlay: 40,
    tooltip: 50,
  },

  // Layout constraints for 480x854
  layout: {
    // Recording view
    recordingDisplay: '70%',
    recordingControls: '30%',
    
    // Dossier view
    dossierSidebar: '25%',
    dossierDisplay: '55%',
    dossierWheel: '20%',
    
    // Ask view
    askDisplay: '60%',
    askControls: '40%',
    
    // Navigation
    topBar: '8%',
    bottomBar: '8%',
    mainContent: '84%',
  },

  // Physical button sizes
  buttons: {
    large: {
      width: '80px',
      height: '80px',
      fontSize: '0.9rem',
    },
    medium: {
      width: '60px',
      height: '60px',
      fontSize: '0.75rem',
    },
    small: {
      width: '45px',
      height: '45px',
      fontSize: '0.65rem',
    },
  },

  // Scroll wheel
  wheel: {
    size: '120px',
    thickness: '40px',
    gripCount: 24,
  },
} as const;

// CSS custom property generator
export function generateCSSVariables(): string {
  return `
    /* Display */
    --display-width: ${theme.display.width}px;
    --display-height: ${theme.display.height}px;
    
    /* Colors */
    --color-phosphor-green: ${theme.colors.phosphorGreen};
    --color-phosphor-green-dim: ${theme.colors.phosphorGreenDim};
    --color-phosphor-green-bright: ${theme.colors.phosphorGreenBright};
    --color-crt-bg: ${theme.colors.crtBackground};
    --color-device-bg: ${theme.colors.deviceBackground};
    --color-device-panel: ${theme.colors.devicePanel};
    
    --color-button-record: ${theme.colors.recordButton};
    --color-button-pause: ${theme.colors.pauseButton};
    --color-button-stop: ${theme.colors.stopButton};
    
    --color-led-active: ${theme.colors.ledActive};
    --color-led-ready: ${theme.colors.ledReady};
    
    /* Typography */
    --font-display: ${theme.typography.displayFont};
    --font-label: ${theme.typography.labelFont};
    
    /* Spacing */
    --spacing-xs: ${theme.spacing.xs};
    --spacing-sm: ${theme.spacing.sm};
    --spacing-md: ${theme.spacing.md};
    --spacing-lg: ${theme.spacing.lg};
    --spacing-xl: ${theme.spacing.xl};
    
    /* Timing */
    --timing-button: ${theme.timing.buttonPress};
    --timing-scan: ${theme.timing.scanLine};
    
    /* Shadows */
    --shadow-button-up: ${theme.shadows.buttonUp};
    --shadow-button-down: ${theme.shadows.buttonDown};
    --shadow-text-glow: ${theme.shadows.textGlow};
  `;
}

export type Theme = typeof theme;
