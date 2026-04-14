<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    dossiers,
    dossiersByType,
    dossiersLoading,
    dossiersError,
    ensureLoaded,
    loadDossiers
  } from '$stores/dossierStore';
  import DossierCard from '../../components/DossierCard.svelte';
  import type { DossierType } from '$lib/types';
  import type { AnyDossier } from '$lib/types/dossier';

  // ── Type meta ──────────────────────────────────────────────────

  const TYPES: DossierType[] = ['NPC', 'PLAYER_CHARACTER', 'LOCATION', 'STORY_PLOT'];

  const TYPE_META: Record<DossierType, { slug: string; label: string; desc: string }> = {
    NPC: {
      slug: 'npc',
      label: 'NPC Registry',
      desc: 'Non-player characters, villains, and allies'
    },
    PLAYER_CHARACTER: {
      slug: 'characters',
      label: 'Characters',
      desc: 'Player characters and their histories'
    },
    LOCATION: {
      slug: 'locations',
      label: 'Locations',
      desc: 'Places, dungeons, towns, and regions'
    },
    STORY_PLOT: {
      slug: 'stories',
      label: 'Story Threads',
      desc: 'Active quests, mysteries, and plot arcs'
    }
  };

  const SLUG_TO_TYPE: Record<string, DossierType> = {
    npc: 'NPC',
    characters: 'PLAYER_CHARACTER',
    locations: 'LOCATION',
    stories: 'STORY_PLOT'
  };

  // ── Sort state ──────────────────────────────────────────────────

  type SortKey = 'name' | 'updatedAt' | 'mentions';
  let sortKey: SortKey = 'name';
  let sortDir: 'asc' | 'desc' = 'asc';

  // ── Reactive: current type filter from URL ──────────────────────

  $: activeSlug = $page.url.searchParams.get('type') ?? null;
  $: activeType = activeSlug ? (SLUG_TO_TYPE[activeSlug] ?? null) : null;

  $: filteredDossiers = (() => {
    const all = activeType ? ($dossiersByType[activeType] ?? []) : $dossiers;
    return [...all].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'updatedAt') cmp = a.updatedAt - b.updatedAt;
      else if (sortKey === 'mentions') cmp = a.mentions.length - b.mentions.length;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  })();

  // ── Actions ─────────────────────────────────────────────────────

  onMount(async () => {
    await ensureLoaded();
  });

  function selectType(slug: string) {
    goto(`/dossiers?type=${slug}`);
  }

  function clearType() {
    goto('/dossiers');
  }

  function openDossier(dossier: AnyDossier) {
    goto(`/dossiers/${dossier.id}`);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  }
</script>

<!-- ─── DOSSIER BROWSE PAGE ─── -->
<div class="page">

  <!-- Page header -->
  <div class="page-header">
    <div class="header-left">
      {#if activeType}
        <button class="back-btn" type="button" on:click={clearType}>← All Dossiers</button>
        <h2>{TYPE_META[activeType].label}</h2>
      {:else}
        <h2>Dossiers</h2>
        <p class="page-desc">Browse all tracked entities from your sessions.</p>
      {/if}
    </div>
    <div class="header-right">
      <button
        class="reload-btn"
        type="button"
        on:click={() => loadDossiers()}
        disabled={$dossiersLoading}
      >Refresh</button>
    </div>
  </div>

  <div class="type-tabs" role="tablist" aria-label="Dossier types">
    <button
      class="type-tab"
      class:active={activeType === null}
      type="button"
      role="tab"
      aria-selected={activeType === null}
      on:click={clearType}
    >All</button>
    {#each TYPES as t (t)}
      {@const meta = TYPE_META[t]}
      <button
        class="type-tab"
        class:active={activeType === t}
        type="button"
        role="tab"
        aria-selected={activeType === t}
        on:click={() => selectType(meta.slug)}
      >{meta.label}</button>
    {/each}
  </div>

  {#if $dossiersLoading}
    <div class="status-panel">Loading dossiers…</div>
  {:else if $dossiersError}
    <div class="status-panel error">{$dossiersError}</div>

  <!-- HUB VIEW: no type filter — show type overview tiles -->
  {:else if !activeType}
    <div class="type-grid">
      {#each TYPES as t (t)}
        {@const meta = TYPE_META[t]}
        {@const count = $dossiersByType[t]?.length ?? 0}
        <button
          class="type-tile"
          type="button"
          on:click={() => selectType(meta.slug)}
        >
          <div class="tile-count">{count}</div>
          <div class="tile-label">{meta.label}</div>
          <div class="tile-desc">{meta.desc}</div>
          <div class="tile-arrow">→</div>
        </button>
      {/each}
    </div>

    <!-- Quick all-dossiers overview if any exist -->
    {#if $dossiers.length > 0}
      <div class="section-header">
        <h3 class="section-title">All Dossiers <span class="count-badge">{$dossiers.length}</span></h3>
        <div class="sort-controls">
          <span class="sort-label">Sort:</span>
          {#each ([['name', 'Name'], ['updatedAt', 'Updated'], ['mentions', 'Mentions']] as const) as [key, lbl]}
            <button
              class="sort-btn"
              class:active={sortKey === key}
              type="button"
              on:click={() => toggleSort(key)}
            >{lbl} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
          {/each}
        </div>
      </div>
      <div class="dossier-grid">
        {#each filteredDossiers as dossier (dossier.id)}
          <DossierCard {dossier} on:click={() => openDossier(dossier)} />
        {/each}
      </div>
    {:else}
      <div class="status-panel">No dossiers yet. Save some transcription extractions to create them.</div>
    {/if}

  <!-- FILTERED VIEW: type tab selected -->
  {:else}
    {@const count = filteredDossiers.length}
    <div class="section-header">
      <h3 class="section-title">
        {count} {count === 1 ? 'entry' : 'entries'}
      </h3>
      <div class="sort-controls">
        <span class="sort-label">Sort:</span>
        {#each ([['name', 'Name'], ['updatedAt', 'Updated'], ['mentions', 'Mentions']] as const) as [key, lbl]}
          <button
            class="sort-btn"
            class:active={sortKey === key}
            type="button"
            on:click={() => toggleSort(key)}
          >{lbl} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
        {/each}
      </div>
    </div>

    {#if filteredDossiers.length === 0}
      <div class="status-panel">No {TYPE_META[activeType].label.toLowerCase()} dossiers yet.</div>
    {:else}
      <div class="dossier-grid">
        {#each filteredDossiers as dossier (dossier.id)}
          <DossierCard {dossier} showType={false} on:click={() => openDossier(dossier)} />
        {/each}
      </div>
    {/if}
  {/if}

</div>

<style>
  .page {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 2rem;
    background: #fef9f0;
    min-height: 0;
  }

  /* ── Page header ── */
  .page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .page-header h2 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #363226;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .page-desc {
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    color: #6b6250;
    margin: 0;
  }

  .back-btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0;
    background: none;
    border: none;
    color: #9a442d;
    cursor: pointer;
    text-align: left;
  }

  .back-btn:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .reload-btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    background: #363226;
    color: #fef9f0;
    border-top: 1px solid #5a5245;
    border-left: 1px solid #5a5245;
    border-bottom: 1px solid #1a180f;
    border-right: 1px solid #1a180f;
  }

  .reload-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .type-tabs {
    display: flex;
    align-items: end;
    gap: 0.35rem;
    margin-top: -0.15rem;
  }

  .type-tab {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.675rem;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    padding: 0.45rem 0.8rem;
    cursor: pointer;
    background: #eee8d8;
    color: #6b6250;
    border-top: 1px solid #f5eee1;
    border-left: 1px solid #f5eee1;
    border-bottom: 1px solid #b3a791;
    border-right: 1px solid #b3a791;
  }

  .type-tab.active {
    background: #ffffff;
    color: #9a442d;
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 1px solid #363226;
    border-right: 1px solid #363226;
  }

  /* ── Status panel ── */
  .status-panel {
    background: #ffffff;
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 2px solid #363226;
    border-right: 2px solid #363226;
    padding: 1.25rem;
    color: #6b6250;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
  }

  .status-panel.error {
    color: #9a442d;
    border-left: 4px solid #9a442d;
  }

  /* ── Type overview grid ── */
  .type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .type-tile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
    padding: 1.25rem;
    background: #ffffff;
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 3px solid #363226;
    border-right: 3px solid #363226;
    cursor: pointer;
    text-align: left;
    transition: box-shadow 0.1s;
    position: relative;
  }

  .type-tile:hover {
    box-shadow: 3px 3px 0 #9a442d;
  }

  .tile-count {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2.25rem;
    font-weight: 700;
    color: #9a442d;
    line-height: 1;
  }

  .tile-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #363226;
  }

  .tile-desc {
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: #6b6250;
    line-height: 1.4;
  }

  .tile-arrow {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    font-size: 1rem;
    color: #b0a489;
  }

  /* ── Section header + sort ── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eee8d8;
  }

  .section-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #363226;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .count-badge {
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    background: #eee8d8;
    color: #6b6250;
  }

  .sort-controls {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .sort-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #9a8f7e;
  }

  .sort-btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.25rem 0.55rem;
    cursor: pointer;
    background: #fef9f0;
    color: #6b6250;
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 1px solid #c8bfae;
    border-right: 1px solid #c8bfae;
  }

  .sort-btn.active {
    background: #363226;
    color: #fef9f0;
    border-top: 1px solid #5a5245;
    border-left: 1px solid #5a5245;
    border-bottom: 1px solid #1a180f;
    border-right: 1px solid #1a180f;
  }

  /* ── Dossier card grid ── */
  .dossier-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
    gap: 0.875rem;
  }
</style>

