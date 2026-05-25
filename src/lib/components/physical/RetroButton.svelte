<script lang="ts">
  /**
   * RetroFuturistic Button - Sharp borders, monospace, terminal aesthetic
   */
  
  export let label: string;
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let disabled = false;
  export let active = false;
  export let onClick: () => void = () => {};
  
  function handleClick() {
    if (!disabled) {
      onClick();
    }
  }
</script>

<button
  class="retro-button {variant} {size}"
  class:disabled
  class:active
  on:click={handleClick}
  {disabled}
>
  <span class="button-label">{label}</span>
</button>

<style>
  .retro-button {
    font-family: var(--font-label);
    font-size: var(--font-size-base);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.75rem 1.5rem;
    border: var(--border-width) var(--border-style) var(--color-terminal-border);
    border-radius: var(--border-radius);
    background: var(--color-terminal-bg);
    color: var(--color-terminal-text);
    cursor: pointer;
    transition: all 100ms ease;
    box-shadow: var(--shadow-button);
    position: relative;
    user-select: none;
  }
  
  .retro-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    transform: translate(-1px, -1px);
    box-shadow: 5px 5px 0 0 rgba(0, 0, 0, 0.3);
  }
  
  .retro-button:active:not(:disabled),
  .retro-button.active {
    transform: translate(2px, 2px);
    box-shadow: var(--shadow-button-active);
  }
  
  .retro-button.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  /* Variants */
  .retro-button.primary {
    border-color: var(--color-terminal-border);
    color: var(--color-terminal-text);
  }
  
  .retro-button.primary.active {
    background: var(--color-terminal-text);
    color: var(--color-terminal-bg);
  }
  
  .retro-button.secondary {
    border-color: var(--color-terminal-dim);
    color: var(--color-terminal-dim);
  }
  
  .retro-button.danger {
    border-color: var(--color-accent-coral);
    color: var(--color-accent-coral);
  }
  
  .retro-button.danger.active {
    background: var(--color-accent-coral);
    color: var(--color-terminal-bg);
  }
  
  /* Sizes */
  .retro-button.small {
    font-size: var(--font-size-small);
    padding: 0.5rem 1rem;
  }
  
  .retro-button.medium {
    font-size: var(--font-size-base);
    padding: 0.75rem 1.5rem;
  }
  
  .retro-button.large {
    font-size: var(--font-size-large);
    padding: 1rem 2rem;
  }
  
  .button-label {
    position: relative;
    z-index: 1;
  }
</style>
