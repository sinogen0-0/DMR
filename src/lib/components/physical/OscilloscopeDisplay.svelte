<script lang="ts">
  /**
   * CRT Oscilloscope Display Component
   * Renders content with green phosphor glow, scan lines, and CRT effects
   */
  
  export let flickering: boolean = true;
  export let scanLines: boolean = true;
  export let className: string = '';
  export let contentClass: string = '';
</script>

<div class="oscilloscope-display {className}" class:flickering class:no-scan-lines={!scanLines}>
  <div class="oscilloscope-content {contentClass}">
    <slot />
  </div>
</div>

<style>
  .oscilloscope-display {
    position: relative;
    background: var(--color-crt-bg);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 
      0 0 20px rgba(0, 255, 65, 0.3),
      inset 0 0 40px rgba(0, 255, 65, 0.1),
      inset 0 0 0 1px rgba(0, 255, 65, 0.2);
  }

  /* Scan line overlay */
  .oscilloscope-display::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0, 255, 65, 0.5) 50%,
      transparent 100%
    );
    animation: scan-line 8s linear infinite;
    z-index: 1000;
    pointer-events: none;
  }

  .oscilloscope-display.no-scan-lines::before {
    display: none;
  }

  @keyframes scan-line {
    0% {
      transform: translateY(-100%);
    }
    100% {
      transform: translateY(100vh);
    }
  }

  /* Horizontal scan lines texture */
  .oscilloscope-display::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      rgba(0, 0, 0, 0.2) 1px,
      transparent 2px,
      transparent 4px
    );
    pointer-events: none;
    z-index: 999;
  }

  .oscilloscope-display.no-scan-lines::after {
    display: none;
  }

  /* Flicker effect */
  @keyframes crt-flicker {
    0% { opacity: 1; }
    2% { opacity: 0.95; }
    4% { opacity: 1; }
    8% { opacity: 0.98; }
    10% { opacity: 1; }
    100% { opacity: 1; }
  }

  .oscilloscope-display.flickering {
    animation: crt-flicker 8s linear infinite;
  }

  /* Content container */
  .oscilloscope-content {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    padding: var(--spacing-md);
    color: var(--color-phosphor-green);
    font-family: var(--font-display);
    overflow: auto;
  }

  /* Scrollbar styling */
  .oscilloscope-content::-webkit-scrollbar {
    width: 6px;
  }

  .oscilloscope-content::-webkit-scrollbar-track {
    background: var(--color-crt-bg-light);
  }

  .oscilloscope-content::-webkit-scrollbar-thumb {
    background: var(--color-phosphor-green-dim);
    border-radius: 3px;
  }

  .oscilloscope-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-phosphor-green);
  }
</style>
