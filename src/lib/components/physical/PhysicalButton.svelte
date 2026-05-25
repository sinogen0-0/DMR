<script lang="ts">
  /**
   * Physical Button Component
   * 3D tactile button with up/down states
   */
  
  import { createEventDispatcher } from 'svelte';
  
  export let label: string;
  export let pressed: boolean = false;
  export let disabled: boolean = false;
  export let variant: 'default' | 'record' | 'pause' | 'stop' = 'default';
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let icon: string = ''; // Optional icon (emoji or symbol)
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    if (!disabled) {
      dispatch('click');
    }
  }
</script>

<button 
  class="physical-button {variant} {size}"
  class:pressed
  class:disabled
  on:click={handleClick}
  {disabled}
  type="button"
>
  {#if icon}
    <span class="button-icon">{icon}</span>
  {/if}
  <span class="button-label">{label}</span>
</button>

<style>
  .physical-button {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    border: none;
    border-radius: 4px;
    background: var(--color-button-default);
    color: #ffffff;
    font-family: var(--font-label);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 100ms cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
    
    /* 3D raised effect */
    box-shadow: 
      0 4px 0 0 #0a0a0a,
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  /* Size variants */
  .physical-button.small {
    width: 45px;
    height: 45px;
    font-size: 0.65rem;
  }

  .physical-button.medium {
    width: 60px;
    height: 60px;
    font-size: 0.75rem;
  }

  .physical-button.large {
    width: 80px;
    height: 80px;
    font-size: 0.9rem;
  }

  /* Hover state */
  .physical-button:hover:not(.disabled):not(.pressed) {
    transform: translateY(-1px);
    box-shadow: 
      0 5px 0 0 #0a0a0a,
      0 5px 12px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  /* Pressed state */
  .physical-button:active:not(.disabled),
  .physical-button.pressed {
    transform: translateY(3px);
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.5),
      inset 0 1px 2px rgba(0, 0, 0, 0.3);
    background: var(--color-button-pressed);
  }

  /* Disabled state */
  .physical-button.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Color variants */
  .physical-button.record {
    background: var(--color-button-record);
    color: #ffffff;
  }

  .physical-button.record.pressed {
    background: #cc3300;
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(255, 68, 0, 0.6);
  }

  .physical-button.pause {
    background: var(--color-button-pause);
    color: #1a1a1a;
  }

  .physical-button.pause.pressed {
    background: #cc8800;
  }

  .physical-button.stop {
    background: var(--color-button-stop);
    color: #999999;
  }

  .physical-button.stop.pressed {
    background: var(--color-button-pressed);
  }

  /* Icon and label */
  .button-icon {
    font-size: 1.5em;
    line-height: 1;
  }

  .button-label {
    font-size: inherit;
    line-height: 1;
    text-align: center;
  }
</style>