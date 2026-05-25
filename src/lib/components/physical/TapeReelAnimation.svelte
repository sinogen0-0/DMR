<script lang="ts">
  /**
   * Tape Reel Animation Component
   * Spinning reel animation for recording state
   */
  
  export let spinning: boolean = false;
  export let size: number = 60; // px
  export let position: 'left' | 'right' = 'left';
</script>

<div class="tape-reel" class:spinning style="width: {size}px; height: {size}px;">
  <div class="reel-outer">
    <div class="reel-inner">
      {#each Array(6) as _, i}
        <div 
          class="reel-spoke" 
          style="transform: rotate({i * 60}deg);"
        />
      {/each}
    </div>
  </div>
  <div class="reel-center" />
</div>

<style>
  .tape-reel {
    position: relative;
    display: inline-block;
  }
  
  .reel-outer {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: 
      radial-gradient(circle at 30% 30%, #3a3a3a, #2a2a2a 50%, #1a1a1a);
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.6),
      inset 0 0 10px rgba(0, 0, 0, 0.5);
  }
  
  .reel-inner {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80%;
    height: 80%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }
  
  .tape-reel.spinning .reel-inner {
    animation: spin 2s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
  
  .reel-spoke {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 80%;
    background: #0a0a0a;
    transform-origin: center center;
  }
  
  .reel-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 25%;
    height: 25%;
    border-radius: 50%;
    background: #1a1a1a;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  }
</style>
