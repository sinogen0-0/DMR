<script lang="ts">
  /**
   * Dossier View - Twin Peaks Tape Deck Archive
   * Browse dossiers with physical category buttons and scroll wheel
   */

  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import OscilloscopeDisplay from '$lib/components/physical/OscilloscopeDisplay.svelte';
  import PhysicalButton from '$lib/components/physical/PhysicalButton.svelte';
  import ButtonPanel from '$lib/components/physical/ButtonPanel.svelte';
  import ScrollWheel from '$lib/components/physical/ScrollWheel.svelte';
  import {
    dossiers,
    dossiersByType,
    dossiersLoading,
    ensureLoaded,
  } from '$stores/dossierStore';
  import type { DossierType, AnyDossier } from '$lib/types/dossier';

  type CategoryFilter = 'ALL' | DossierType;

  // Category metadata
  const CATEGORIES: Array<{ id: CategoryFilter; label: string; icon: string }> = [
    { id: 'ALL', label: 'ALL', icon: '◉' },
    { id: 'NPC', label: 'NPC', icon: '👤' },
    { id: 'PLAYER_CHARACTER', label: 'CHAR', icon: '⚔' },
    { id: 'LOCATION', label: 'LOC', icon: '📍' },
    { id: 'STORY_PLOT', label: 'STORY', icon: '📖' },
  ];

  // State
  let selectedCategory: CategoryFilter = 'ALL';
  let scrollPosition = 0;
  let selectedDossierIndex = -1;

  // Filtered and sorted dossiers
  $: filteredDossiers = (() => {
    if (selectedCategory === 'ALL') {
      return $dossiers;
    }
    return $dossiersByType[selectedCategory] ?? [];
  })();

  $: sortedDossiers = [...filteredDossiers].sort((a, b) => 
    b.updatedAt - a.updatedAt // Most recent first
  );

  $: selectedDossier = selectedDossierIndex >= 0 && selectedDossierIndex < sortedDossiers.length
    ? sortedDossiers[selectedDossierIndex]
    : null;

  onMount(async () => {
    await ensureLoaded();
  });

  function handleCategoryClick(category: CategoryFilter) {
    selectedCategory = category;
    scrollPosition = 0;
    selectedDossierIndex = -1;
  }

  function handleScrollChange(event: CustomEvent<{ value: number }>) {
    scrollPosition = event.detail.value;
    // Map scroll position to dossier index
    const maxIndex = sortedDossiers.length - 1;
    selectedDossierIndex = Math.round((scrollPosition / 100) * maxIndex);
  }

  function openDossier(dossier: AnyDossier) {
    goto(`/dossiers/${dossier.id}`);
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getTypeColor(type: DossierType): string {
    const colors: Record<DossierType, string> = {
      NPC: '#ff8844',
      PLAYER_CHARACTER: '#44ff88',
      LOCATION: '#4488ff',
      STORY_PLOT: '#ff44ff',
    };
    return colors[type] || 'var(--color-phosphor-green)';
  }
</script>

<div class="dossier-view">
  <!-- Left Panel - Category Buttons (25%) -->
  <div class="category-panel">
    <ButtonPanel className="category-buttons">
      <div class="panel-label crt-text-dim">CATEGORY</div>
      {#each CATEGORIES as category}
        <PhysicalButton
          label={category.label}
          icon={category.icon}
          variant="default"
          size="medium"
          pressed={selectedCategory === category.id}
          on:click={() => handleCategoryClick(category.id)}
        />
      {/each}
    </ButtonPanel>
  </div>

  <!-- Center - Oscilloscope Display (55%) -->
  <div class="display-section">
    <OscilloscopeDisplay className="dossier-display">
      <div class="display-content">
        <!-- Header -->
        <div class="display-header">
          <div class="header-title crt-text-bright">FIELD LOG: ARCHIVE</div>
          <div class="count-indicator crt-text-dim">
            [{sortedDossiers.length}] RECORDS
          </div>
        </div>

        <div class="divider" />

        {#if $dossiersLoading}
          <div class="loading-state crt-text">
            <span class="led pulse active" />
            <span>&gt; LOADING DATABASE...</span>
          </div>
        {:else if sortedDossiers.length === 0}
          <div class="empty-state crt-text-dim">
            <p>&gt; NO RECORDS FOUND</p>
            <p>&gt; FILTER: {selectedCategory}</p>
          </div>
        {:else}
          <!-- Dossier List -->
          <div class="dossier-list">
            {#each sortedDossiers as dossier, i}
              <button
                class="dossier-item crt-text {i === selectedDossierIndex ? 'selected' : ''}"
                on:click={() => openDossier(dossier)}
              >
                <div class="item-header">
                  <span 
                    class="item-type" 
                    style="color: {getTypeColor(dossier.type)}"
                  >
                    [{dossier.type}]
                  </span>
                  <span class="item-date crt-text-dim">
                    {formatDate(dossier.updatedAt)}
                  </span>
                </div>
                <div class="item-name crt-text-bright">
                  {#if i === selectedDossierIndex}&gt; {/if}{dossier.name}
                </div>
                {#if dossier.description && i === selectedDossierIndex}
                  <div class="item-description crt-text-dim">
                    {dossier.description.substring(0, 120)}
                    {dossier.description.length > 120 ? '...' : ''}
                  </div>
                {/if}
                {#if dossier.mentions.length > 0}
                  <div class="item-mentions crt-text-dim">
                    {dossier.mentions.length} mention{dossier.mentions.length !== 1 ? 's' : ''}
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </OscilloscopeDisplay>
  </div>

  <!-- Right Panel - Scroll Wheel (20%) -->
  <div class="wheel-section">
    <div class="wheel-container">
      <div class="wheel-label crt-text-dim">SCROLL</div>
      <ScrollWheel
        bind:value={scrollPosition}
        min={0}
        max={100}
        step={1}
        size={120}
        adaptiveResistance={true}
        on:change={handleScrollChange}
      />
      {#if selectedDossier}
        <div class="wheel-info crt-text-dim">
          {selectedDossierIndex + 1} / {sortedDossiers.length}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .dossier-view {
    display: flex;
    height: 100%;
    background: var(--color-device-bg);
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }

  /* Category Panel - 25% */
  .category-panel {
    flex: 0 0 25%;
    min-width: 0;
  }

  .category-buttons {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .panel-label {
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-align: center;
    margin-bottom: var(--spacing-xs);
  }

  /* Display Section - 55% */
  .display-section {
    flex: 0 0 55%;
    min-width: 0;
  }

  .dossier-display {
    height: 100%;
  }

  .display-content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    height: 100%;
  }

  /* Header */
  .display-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-title {
    font-size: 0.9rem;
    font-weight: bold;
    letter-spacing: 0.1em;
  }

  .count-indicator {
    font-size: 0.7rem;
  }

  .divider {
    height: 1px;
    background: var(--color-phosphor-green-dim);
    opacity: 0.3;
    box-shadow: 0 0 2px var(--color-phosphor-glow);
  }

  /* Loading/Empty States */
  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl);
    font-size: 0.9rem;
  }

  /* Dossier List */
  .dossier-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .dossier-item {
    background: transparent;
    border: 1px solid var(--color-phosphor-green-dim);
    color: var(--color-phosphor-green);
    font-family: var(--font-display);
    padding: var(--spacing-sm);
    text-align: left;
    cursor: pointer;
    transition: all 100ms;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .dossier-item:hover {
    background: var(--color-crt-bg-light);
    border-color: var(--color-phosphor-green);
    box-shadow: 0 0 8px var(--color-phosphor-glow);
  }

  .dossier-item.selected {
    background: var(--color-crt-bg-light);
    border-color: var(--color-phosphor-green-bright);
    box-shadow: 0 0 12px var(--color-phosphor-glow);
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
  }

  .item-type {
    font-weight: bold;
    opacity: 0.8;
  }

  .item-date {
    font-size: 0.65rem;
  }

  .item-name {
    font-size: 0.85rem;
    font-weight: bold;
    line-height: 1.3;
  }

  .item-description {
    font-size: 0.75rem;
    line-height: 1.4;
    margin-top: var(--spacing-xs);
  }

  .item-mentions {
    font-size: 0.65rem;
    margin-top: var(--spacing-xs);
  }

  /* Wheel Section - 20% */
  .wheel-section {
    flex: 0 0 20%;
    min-width: 0;
  }

  .wheel-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    background: var(--color-device-panel);
    border-radius: 8px;
    padding: var(--spacing-md);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
  }

  .wheel-label {
    font-size: 0.7rem;
    letter-spacing: 0.1em;
  }

  .wheel-info {
    font-size: 0.75rem;
    text-align: center;
  }

  /* Scrollbar styling */
  .dossier-list::-webkit-scrollbar {
    width: 6px;
  }

  .dossier-list::-webkit-scrollbar-track {
    background: var(--color-crt-bg-light);
  }

  .dossier-list::-webkit-scrollbar-thumb {
    background: var(--color-phosphor-green-dim);
    border-radius: 3px;
  }

  .dossier-list::-webkit-scrollbar-thumb:hover {
    background: var(--color-phosphor-green);
  }
</style>
