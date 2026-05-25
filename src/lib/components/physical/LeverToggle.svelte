<script lang="ts">
  /**
   * Lever Toggle Switch
   * Hi-fi stereo style latching lever switch for navigation and mode selection
   */
  
  export let active = false;
  export let label: string;
  export let icon = '';
  export let disabled = false;
  export let onToggle: () => void = () => {};
  
  function handleClick() {
    if (disabled) return;
    onToggle();
  }
</script>

<div class="lever-toggle" class:disabled>
  <button
    class="toggle-button"
    class:active
    on:click={handleClick}
    {disabled}
    aria-label={label}
  >
    <!-- Toggle Housing -->
    <div class="toggle-housing">
      <!-- Lever Slot -->
      <div class="lever-slot"></div>
      
      <!-- Lever Arm -->
      <div class="lever-arm" class:active>
        <div class="lever-handle"></div>
      </div>
    </div>
    
    <!-- Icon (if provided) -->
    {#if icon}
      <div class="toggle-icon">{icon}</div>
    {/if}
    
    <!-- Label -->
    <div class="toggle-label">{label}</div>
    
    <!-- Indicator Lamp -->
    <div class="indicator-lamp" class:active></div>
  </button>
</div>

<style>
  .lever-toggle {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    user-select: none;
  }
  
  .lever-toggle.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  
  /* Toggle Button Container */
  .toggle-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
    position: relative;
    transition: all 120ms;
  }
  
  .toggle-button:disabled {
    cursor: not-allowed;
  }
  
  /* Toggle Housing (Metal Frame) */
  .toggle-housing {
    width: 40px;
    height: 56px;
    background: var(--color-toggle-base);
    border: 2px solid var(--color-chassis-bezel);
    border-radius: 6px;
    position: relative;
    box-shadow: var(--shadow-toggle-groove);
    overflow: hidden;
  }
  
  /* Lever Slot (Vertical Channel) */
  .lever-slot {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 40px;
    background: var(--color-toggle-groove);
    border-radius: 4px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  }
  
  /* Lever Arm */
  .lever-arm {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 16px;
    height: 32px;
    transition: top 180ms cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 2;
  }
  
  .lever-arm.active {
    top: 16px;
  }
  
  .toggle-button:hover:not(:disabled) .lever-arm:not(.active) {
    top: 10px;
  }
  
  .toggle-button:active:not(:disabled) .lever-arm {
    transition: top 80ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  /* Lever Handle (Ivory Cap) */
  .lever-handle {
    width: 16px;
    height: 32px;
    background: var(--color-toggle-ivory);
    border-radius: 8px;
    box-shadow: 
      inset 1px 1px 0 rgba(255, 255, 255, 0.8),
      inset -1px -1px 0 var(--color-toggle-cap-shadow),
      var(--shadow-lever-depth);
    position: relative;
  }
  
  .lever-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 20px;
    background: radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.4), transparent 60%);
    border-radius: 5px;
  }
  
  /* Icon */
  .toggle-icon {
    font-size: 1.1rem;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 120ms;
  }
  
  .toggle-button.active .toggle-icon {
    opacity: 1;
  }
  
  /* Label */
  .toggle-label {
    font-family: var(--font-label);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-toggle-ivory);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    transition: color 120ms;
  }
  
  .toggle-button.active .toggle-label {
    color: #ffffff;
    text-shadow: 
      0 0 4px var(--color-lamp-amber),
      0 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  /* Indicator Lamp */
  .indicator-lamp {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-lamp-off);
    box-shadow: inset 0 1px 2px var(--color-lamp-off-shadow);
    transition: all 200ms;
  }
  
  .indicator-lamp.active {
    background: var(--color-lamp-amber);
    box-shadow: 
      0 0 8px var(--color-lamp-amber-glow),
      0 0 16px var(--color-lamp-amber-glow),
      inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }
</style>
