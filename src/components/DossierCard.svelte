<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { AnyDossier } from '$lib/types/dossier';

  export let dossier: AnyDossier;
  export let showType: boolean = true;

  const dispatch = createEventDispatcher<{ click: AnyDossier }>();

  const TYPE_LABELS: Record<AnyDossier['type'], string> = {
    NPC: 'NPC',
    PLAYER_CHARACTER: 'Character',
    LOCATION: 'Location',
    STORY_PLOT: 'Story'
  };

  const TYPE_COLORS: Record<AnyDossier['type'], string> = {
    NPC: '#9a442d',
    PLAYER_CHARACTER: '#4b654e',
    LOCATION: '#3d5a7a',
    STORY_PLOT: '#6b4e7a'
  };

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function handleClick() {
    dispatch('click', dossier);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch('click', dossier);
    }
  }

  $: hasActivity = dossier.mentions.length > 0;
  $: isMerged = dossier.mentions.length > 1;
  $: accentColor = TYPE_COLORS[dossier.type];
</script>

<article
  class="dossier-card"
  on:click={handleClick}
  on:keydown={handleKeydown}
  role="button"
  tabindex="0"
  aria-label="Open {dossier.name} dossier"
>
  <div class="card-header">
    <div class="name-row">
      <span
        class="led"
        class:active={hasActivity}
        class:merged={isMerged}
        title={isMerged ? 'Multi-source merged' : hasActivity ? 'Active' : 'No mentions yet'}
      ></span>
      <h3 class="name">{dossier.name}</h3>
    </div>
    {#if showType}
      <span class="type-chip" style="--chip-color: {accentColor}">{TYPE_LABELS[dossier.type]}</span>
    {/if}
  </div>

  {#if dossier.description}
    <p class="description">{dossier.description}</p>
  {:else}
    <p class="description empty">No description yet.</p>
  {/if}

  <div class="card-meta">
    <div class="meta-stat">
      <span class="meta-num">{dossier.mentions.length}</span>
      <span class="meta-lbl">mention{dossier.mentions.length !== 1 ? 's' : ''}</span>
    </div>
    {#if dossier.relationships.length > 0}
      <div class="meta-stat">
        <span class="meta-num">{dossier.relationships.length}</span>
        <span class="meta-lbl">link{dossier.relationships.length !== 1 ? 's' : ''}</span>
      </div>
    {/if}
    <div class="meta-date">
      {formatDate(dossier.updatedAt)}
    </div>
  </div>
</article>

<style>
  .dossier-card {
    background: #ffffff;
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 2px solid #363226;
    border-right: 2px solid #363226;
    padding: 1rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    transition: box-shadow 0.1s;
  }

  .dossier-card:hover {
    box-shadow: 2px 2px 0 #9a442d;
  }

  .dossier-card:focus-visible {
    outline: 2px solid #9a442d;
    outline-offset: 2px;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  /* LED indicator dot */
  .led {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c9bfae;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
  }

  .led.active {
    background: #4b654e;
    box-shadow: 0 0 4px rgba(75, 101, 78, 0.6), inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .led.merged {
    background: #3d7a9a;
    box-shadow: 0 0 4px rgba(61, 90, 122, 0.6), inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #363226;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .type-chip {
    flex-shrink: 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.15rem 0.4rem;
    border: 1px solid var(--chip-color, #9a442d);
    color: var(--chip-color, #9a442d);
    background: transparent;
  }

  .description {
    font-family: 'Inter', sans-serif;
    font-size: 0.8125rem;
    color: #5a5245;
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .description.empty {
    color: #b0a48a;
    font-style: italic;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: auto;
    padding-top: 0.25rem;
    border-top: 1px solid #eee8d8;
  }

  .meta-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .meta-num {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    color: #363226;
    line-height: 1;
  }

  .meta-lbl {
    font-family: 'Inter', sans-serif;
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #9a8f7e;
  }

  .meta-date {
    font-family: 'Inter', sans-serif;
    font-size: 0.6875rem;
    color: #9a8f7e;
    margin-left: auto;
  }
</style>
