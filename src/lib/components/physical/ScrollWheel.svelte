<script lang="ts">
  /**
   * Scroll Wheel Component
   * Adaptive feedback wheel with haptic simulation
   */
  
  import { createEventDispatcher } from 'svelte';
  
  export let value: number = 0; // Current scroll position
  export let min: number = 0;
  export let max: number = 100;
  export let step: number = 1;
  export let size: number = 120; // px
  export let adaptiveResistance: boolean = true;
  
  const dispatch = createEventDispatcher();
  
  let isDragging = false;
  let startY = 0;
  let startValue = 0;
  let wheelRotation = 0;
  
  function handleTouchStart(e: TouchEvent) {
    isDragging = true;
    startY = e.touches[0].clientY;
    startValue = value;
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    
    const deltaY = startY - e.touches[0].clientY;
    const scrollAmount = deltaY / 2; // Sensitivity
    
    let newValue = startValue + scrollAmount * step;
    
    // Apply adaptive resistance near boundaries
    if (adaptiveResistance) {
      const range = max - min;
      const distanceFromMin = newValue - min;
      const distanceFromMax = max - newValue;
      
      if (distanceFromMin < range * 0.1) {
        // Near minimum, add resistance
        const resistance = 1 - (distanceFromMin / (range * 0.1)) * 0.7;
        newValue = min + distanceFromMin * resistance;
      } else if (distanceFromMax < range * 0.1) {
        // Near maximum, add resistance
        const resistance = 1 - (distanceFromMax / (range * 0.1)) * 0.7;
        newValue = max - distanceFromMax * resistance;
      }
    }
    
    // Clamp value
    newValue = Math.max(min, Math.min(max, newValue));
    
    if (newValue !== value) {
      value = newValue;
      wheelRotation = ((value - min) / (max - min)) * 360 * 4; // Multiple rotations
      dispatch('change', { value });
      
      // Haptic feedback every 5 units
      if (Math.floor(value) % 5 === 0 && 'vibrate' in navigator) {
        navigator.vibrate(5);
      }
    }
  }
  
  function handleTouchEnd() {
    isDragging = false;
  }
</script>

<div class="scroll-wheel-container">
  <div 
    class="scroll-wheel"
    style="width: {size}px; height: {size}px; transform: rotate({wheelRotation}deg);"
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
    role="slider"
    aria-valuenow={value}
    aria-valuemin={min}
    aria-valuemax={max}
  >
    {#each Array(24) as _, i}
      <div 
        class="wheel-grip" 
        style="transform: rotate({i * 15}deg) translateY(-{size/2 - 10}px);"
      />
    {/each}
  </div>
</div>

<style>
  .scroll-wheel-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md);
    user-select: none;
    -webkit-user-select: none;
  }
  
  .scroll-wheel {
    position: relative;
    border-radius: 50%;
    background: 
      radial-gradient(circle at 30% 30%, #4a4a4a, #2a2a2a 50%, #1a1a1a);
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.6),
      inset 0 0 20px rgba(0, 0, 0, 0.5),
      inset -3px -3px 8px rgba(255, 255, 255, 0.1);
    transition: transform 0.1s ease-out;
    touch-action: none;
  }
  
  .scroll-wheel::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40%;
    height: 40%;
    border-radius: 50%;
    background: #1a1a1a;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8);
  }
  
  .wheel-grip {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 3px;
    height: 12px;
    background: #0a0a0a;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    transform-origin: center center;
  }
</style>
