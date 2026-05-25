<script lang="ts">
  /**
   * Segmented Toggle Control (3-Position)
   * Hi-fi stereo style mechanical segmented switch for Rec/Pause/Stop
   */
  
  export let activePosition: 'rec' | 'pause' | 'stop' = 'stop';
  export let disabled = false;
  export let onPositionChange: (position: 'rec' | 'pause' | 'stop') => void = () => {};
  
  type Position = 'rec' | 'pause' | 'stop';
  
  const positions: { value: Position; label: string; color: string }[] = [
    { value: 'rec', label: 'REC', color: 'var(--color-button-record)' },
    { value: 'pause', label: 'PAUSE', color: 'var(--color-button-pause)' },
    { value: 'stop', label: 'STOP', color: 'var(--color-button-stop)' }
  ];
  
  function handlePositionClick(position: Position) {
    if (disabled) return;
    activePosition = position;
    onPositionChange(position);
  }
</script>

<div class="segmented-toggle" class:disabled>
  <!-- Toggle Base (Groove) -->
  <div class="toggle-base">
    <!-- Segments -->
    {#each positions as pos}
      <button
        class="toggle-segment"
        class:active={activePosition === pos.value}
        style="--segment-color: {pos.color}"
        on:click={() => handlePositionClick(pos.value)}
        {disabled}
      >
        <!-- Segment Cap -->
        <div class="segment-cap">
          <div class="cap-surface"></div>
        </div>
        
        <!-- Label -->
        <div class="segment-label">{pos.label}</div>
        
        <!-- Indicator Lamp -->
        <div class="segment-lamp" class:active={activePosition === pos.value}></div>
      </button>
    {/each}
  </div>
</div>

<style>
  .segmented-toggle {
    display: inline-flex;
    flex-direction: column;
    gap: 0.5rem;
    user-select: none;
  }
  
  .segmented-toggle.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  
  /* Toggle Base (Horizontal Groove) */
  .toggle-base {
    display: flex;
    gap: 0;
    background: var(--color-toggle-groove);
    border-radius: 6px;
    padding: 0.5rem;
    box-shadow: var(--shadow-toggle-groove);
    border: 2px solid var(--color-chassis-bezel);
  }
  
  /* Individual Toggle Segment */
  .toggle-segment {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
    position: relative;
    transition: all 120ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .toggle-segment:disabled {
    cursor: not-allowed;
  }
  
  /* Segment Cap (Ivory/Cream Toggle Button) */
  .segment-cap {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-toggle-ivory);
    box-shadow: 
      inset 1px 1px 0 rgba(255, 255, 255, 0.8),
      inset -1px -1px 0 var(--color-toggle-cap-shadow),
      var(--shadow-mechanical-raised);
    position: relative;
    transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .toggle-segment:hover:not(:disabled) .segment-cap {
    background: #faf8f2;
    transform: translateY(-1px);
  }
  
  .toggle-segment:active:not(:disabled) .segment-cap {
    transform: translateY(2px);
    box-shadow: 
      inset 2px 2px 6px rgba(0, 0, 0, 0.3),
      0 1px 2px rgba(0, 0, 0, 0.2);
  }
  
  .toggle-segment.active .segment-cap {
    background: var(--color-toggle-cream);
    transform: translateY(2px);
    box-shadow: var(--shadow-mechanical-pressed);
  }
  
  /* Cap Surface Detail */
  .cap-surface {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), transparent 60%);
  }
  
  /* Segment Label */
  .segment-label {
    font-family: var(--font-label);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-toggle-ivory);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    transition: color 120ms;
  }
  
  .toggle-segment.active .segment-label {
    color: #ffffff;
    text-shadow: 
      0 0 4px var(--segment-color),
      0 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  /* Indicator Lamp */
  .segment-lamp {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-lamp-off);
    box-shadow: inset 0 1px 2px var(--color-lamp-off-shadow);
    transition: all 200ms;
  }
  
  .segment-lamp.active {
    background: var(--segment-color);
    box-shadow: 
      0 0 8px var(--segment-color),
      0 0 16px var(--segment-color),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);
  }
</style>
