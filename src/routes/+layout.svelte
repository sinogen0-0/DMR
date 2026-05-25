<script lang="ts">
  /**
   * Main Layout - Teenage Engineering Style Tape Deck Interface
   * Compact bottom navigation buttons (15% height) + Content area (85%)
   */

  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import '$lib/styles/global.css';
  import { soundService } from '$lib/services/soundService';
  import { hapticService } from '$lib/services/hapticService';
  import { onMount } from 'svelte';

  type ViewMode = 'recording' | 'dossiers' | 'ask';

  // Determine current view from URL
  $: currentView = (() => {
    const pathname = $page.url.pathname;
    if (pathname.startsWith('/recording')) return 'recording';
    if (pathname.startsWith('/dossiers')) return 'dossiers';
    if (pathname.startsWith('/ask')) return 'ask';
    return 'recording'; // default
  })();

  async function navigateToView(view: ViewMode) {
    // Haptic + sound feedback
    await hapticService.buttonPress('nav');
    soundService.playButtonClick('nav');

    const routes: Record<ViewMode, string> = {
      recording: '/recording',
      dossiers: '/dossiers',
      ask: '/ask',
    };
    goto(routes[view]);
  }

  async function openSettings() {
    await hapticService.buttonPress('toggle');
    soundService.playButtonClick('toggle');
    goto('/settings');
  }

  // Check if we're on settings page
  $: isSettingsPage = $page.url.pathname.startsWith('/settings');

  onMount(() => {
    // Resume audio context on first interaction
    soundService.resume();
  });
</script>

<div id="app">
  {#if !isSettingsPage}
    <!-- Main Content Area (85%) -->
    <div class="main-content">
      <!-- Settings icon in top-right corner -->
      <button class="settings-icon-button" on:click={openSettings} title="Settings">
        <span>⚙</span>
      </button>
      
      <slot />
    </div>

    <!-- Retro Terminal Navigation -->
    <nav class="nav-panel">
      <button
        class="nav-button"
        class:active={currentView === 'recording'}
        on:click={() => navigateToView('recording')}
      >
        <span class="nav-label">REC</span>
      </button>
      
      <button
        class="nav-button"
        class:active={currentView === 'dossiers'}
        on:click={() => navigateToView('dossiers')}
      >
        <span class="nav-label">DOSSIER</span>
      </button>
      
      <button
        class="nav-button"
        class:active={currentView === 'ask'}
        on:click={() => navigateToView('ask')}
      >
        <span class="nav-label">ASK</span>
      </button>
    </nav>
  {:else}
    <!-- Settings page (full screen) -->
    <div class="settings-fullscreen">
      <slot />
    </div>
  {/if}
</div>

<style>
  #app {
    width: 100vw;
    height: 100vh;
    max-width: var(--display-width);
    max-height: var(--display-height);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: var(--color-terminal-bg);
    overflow: hidden;
    position: relative;
    /* Brushed Aluminum Chassis */
    border: var(--chassis-border-width) solid;
    border-image: linear-gradient(
      135deg,
      var(--color-chassis-aluminum-light) 0%,
      var(--color-chassis-aluminum) 25%,
      var(--color-chassis-aluminum-dark) 50%,
      var(--color-chassis-aluminum) 75%,
      var(--color-chassis-aluminum-light) 100%
    ) 1;
    box-shadow: 
      inset 0 0 20px rgba(0, 0, 0, 0.3),
      0 4px 16px rgba(0, 0, 0, 0.5);
  }
  
  /* Brushed metal texture effect */
  #app::before {
    content: '';
    position: absolute;
    top: calc(var(--chassis-border-width) * -1);
    left: calc(var(--chassis-border-width) * -1);
    right: calc(var(--chassis-border-width) * -1);
    bottom: calc(var(--chassis-border-width) * -1);
    background: 
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 2px,
        rgba(255, 255, 255, 0.03) 2px,
        rgba(255, 255, 255, 0.03) 3px
      ),
      linear-gradient(
        135deg,
        var(--color-chassis-aluminum-light) 0%,
        var(--color-chassis-aluminum) 25%,
        var(--color-chassis-aluminum-dark) 50%,
        var(--color-chassis-aluminum) 75%,
        var(--color-chassis-aluminum-light) 100%
      );
    z-index: -1;
    pointer-events: none;
  }
  
  /* Inner shadow for depth */
  #app::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 1px solid rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }

  /* Main Content Area - 85% */
  .main-content {
    flex: 1 1 auto;
    position: relative;
    overflow: hidden;
    background: var(--color-terminal-bg);
  }

  /* Settings Icon (Top-Right) */
  .settings-icon-button {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(26, 26, 26, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.4);
    font-size: 1rem;
    cursor: pointer;
    z-index: 100;
    transition: all 150ms;
    backdrop-filter: blur(4px);
  }

  .settings-icon-button:hover {
    background: rgba(40, 40, 40, 0.9);
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .settings-icon-button:active {
    transform: scale(0.95);
    background: rgba(20, 20, 20, 0.9);
  }

  /* Retro Terminal Navigation */
  .nav-panel {
    flex: 0 0 auto;
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 0;
    padding: 0;
    background: var(--color-terminal-bg);
    border-top: var(--border-width) var(--border-style) var(--color-terminal-border);
    position: relative;
  }
  
  /* Chassis effect on nav panel */
  .nav-panel::before {
    content: '';
    position: absolute;
    bottom: calc(var(--chassis-border-width) * -1);
    left: calc(var(--chassis-border-width) * -1);
    right: calc(var(--chassis-border-width) * -1);
    height: var(--chassis-border-width);
    background: 
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 2px,
        rgba(255, 255, 255, 0.03) 2px,
        rgba(255, 255, 255, 0.03) 3px
      ),
      linear-gradient(
        135deg,
        var(--color-chassis-aluminum-light),
        var(--color-chassis-aluminum),
        var(--color-chassis-aluminum-dark)
      );
    pointer-events: none;
    z-index: 10;
  }
  
  .nav-button {
    flex: 1;
    padding: 1rem;
    background: var(--color-terminal-bg);
    border: none;
    border-right: var(--border-width) var(--border-style) var(--color-terminal-dim);
    color: var(--color-terminal-dim);
    font-family: var(--font-label);
    font-size: var(--font-size-base);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 100ms;
  }
  
  .nav-button:last-child {
    border-right: none;
  }
  
  .nav-button:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-terminal-text);
  }
  
  .nav-button.active {
    background: var(--color-terminal-text);
    color: var(--color-terminal-bg);
  }
  
  .nav-label {
    display: block;
  }

  /* Settings Full Screen */
  .settings-fullscreen {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  /* Global Text Styles */
  :global(.crt-text) {
    color: var(--color-phosphor-green);
    text-shadow: 
      0 0 4px rgba(0, 255, 65, 0.8),
      0 0 8px rgba(0, 255, 65, 0.4);
    font-family: var(--font-display);
    letter-spacing: 0.05em;
  }

  :global(.crt-text-bright) {
    color: var(--color-phosphor-green-bright);
    text-shadow: 
      0 0 6px rgba(0, 255, 65, 1),
      0 0 12px rgba(0, 255, 65, 0.6),
      0 0 20px rgba(0, 255, 65, 0.3);
  }

  :global(.crt-text-dim) {
    color: var(--color-phosphor-green-dim);
    text-shadow: 
      0 0 3px rgba(0, 255, 65, 0.5),
      0 0 6px rgba(0, 255, 65, 0.2);
  }

  /* LED Indicators */
  :global(.led) {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-led-inactive);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  :global(.led.active) {
    background: var(--color-led-active);
    box-shadow: 
      0 0 4px var(--color-led-active),
      0 0 8px var(--color-led-active),
      inset 0 1px 1px rgba(255, 255, 255, 0.3);
  }

  :global(.led.ready) {
    background: var(--color-led-ready);
    box-shadow: 
      0 0 4px var(--color-led-ready),
      0 0 8px var(--color-led-ready),
      inset 0 1px 1px rgba(255, 255, 255, 0.3);
  }

  :global(.led.warning) {
    background: var(--color-led-warning);
    box-shadow: 
      0 0 4px var(--color-led-warning),
      0 0 8px var(--color-led-warning),
      inset 0 1px 1px rgba(255, 255, 255, 0.3);
  }

  :global(.led.pulse) {
    animation: led-pulse 1s ease-in-out infinite;
  }

  @keyframes led-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  /* CRT Cursor */
  :global(.crt-cursor) {
    display: inline-block;
    width: 0.6em;
    height: 1em;
    background: var(--color-phosphor-green);
    animation: cursor-blink 1s step-end infinite;
    box-shadow: 0 0 8px var(--color-phosphor-glow);
    vertical-align: text-bottom;
  }

  @keyframes cursor-blink {
    0%, 49% {
      opacity: 1;
    }
    50%, 100% {
      opacity: 0;
    }
  }
</style>
