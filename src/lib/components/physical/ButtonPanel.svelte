<script lang="ts">
  /**
   * Button Panel Container
   * Layout container for arranging physical buttons
   */
  
  export let orientation: 'horizontal' | 'vertical' = 'vertical';
  export let align: 'start' | 'center' | 'end' | 'space-between' = 'center';
  export let gap: 'sm' | 'md' | 'lg' = 'md';
  export let className: string = '';
</script>

<div class="button-panel {orientation} align-{align} gap-{gap} {className}">
  <slot />
</div>

<style>
  .button-panel {
    display: flex;
    background: var(--color-device-panel);
    border-radius: 8px;
    padding: var(--spacing-md);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
  }

  .button-panel.vertical {
    flex-direction: column;
  }

  .button-panel.horizontal {
    flex-direction: row;
  }

  .button-panel.align-start {
    justify-content: flex-start;
    align-items: flex-start;
  }

  .button-panel.align-center {
    justify-content: center;
    align-items: center;
  }

  .button-panel.align-end {
    justify-content: flex-end;
    align-items: flex-end;
  }

  .button-panel.align-space-between {
    justify-content: space-between;
    align-items: center;
  }

  .button-panel.gap-sm {
    gap: var(--spacing-sm);
  }

  .button-panel.gap-md {
    gap: var(--spacing-md);
  }

  .button-panel.gap-lg {
    gap: var(--spacing-lg);
  }
</style>
