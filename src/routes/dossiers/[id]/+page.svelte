<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { createDossierService } from '$services';
  import type { AnyDossier } from '$lib/types/dossier';

  const dossierService = createDossierService();

  let loading = true;
  let error = '';
  let dossier: AnyDossier | null = null;

  $: dossierId = $page.params.id;

  onMount(async () => {
    await loadDossier();
  });

  async function loadDossier(): Promise<void> {
    loading = true;
    error = '';

    try {
      await dossierService.initialize();
      dossier = await dossierService.readDossier(dossierId);
      if (!dossier) {
        throw new Error('Dossier not found.');
      }
    } catch (err) {
      error = `Unable to load dossier: ${String(err)}`;
    } finally {
      loading = false;
    }
  }

  function formatType(type: AnyDossier['type']): string {
    if (type === 'PLAYER_CHARACTER') return 'Character';
    if (type === 'STORY_PLOT') return 'Story Plot';
    return type.charAt(0) + type.slice(1).toLowerCase();
  }
</script>

<div class="dossier-detail">
  <div class="header-strip">
    <button class="back-button" type="button" on:click={() => goto('/dossiers')}>Back</button>
    <div>
      <div class="eyebrow">Dossier Detail</div>
      <h1>{dossier?.name || 'Loading dossier...'}</h1>
    </div>
  </div>

  {#if loading}
    <div class="panel">Loading dossier...</div>
  {:else if error}
    <div class="panel error">{error}</div>
  {:else if dossier}
    <div class="detail-grid">
      <section class="panel">
        <div class="section-label">Type</div>
        <p>{formatType(dossier.type)}</p>
      </section>

      <section class="panel">
        <div class="section-label">Description</div>
        <p>{dossier.description || 'No description saved yet.'}</p>
      </section>

      <section class="panel">
        <div class="section-label">Relationships</div>
        {#if dossier.relationships.length === 0}
          <p>No relationships recorded.</p>
        {:else}
          <ul>
            {#each dossier.relationships as relationship}
              <li>{relationship.relationshipType}: {relationship.targetDossierId}</li>
            {/each}
          </ul>
        {/if}
      </section>

      <section class="panel">
        <div class="section-label">Mentions</div>
        {#if dossier.mentions.length === 0}
          <p>No mentions recorded.</p>
        {:else}
          <ul>
            {#each dossier.mentions as mention}
              <li>{new Date(mention.timestamp).toLocaleString()} — {mention.context}</li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .dossier-detail {
    display: grid;
    gap: 0.9rem;
    padding: 1rem 0 2rem;
  }

  .header-strip {
    display: flex;
    gap: 1rem;
    align-items: center;
    background: #eee8d8;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #c7b89f;
    padding: 0.85rem 1rem;
  }

  .back-button {
    border: none;
    background: #f7f1e6;
    color: #363226;
    cursor: pointer;
    padding: 0.45rem 0.75rem;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #b8ad98;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .eyebrow,
  .section-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a442d;
  }

  h1 {
    margin: 0.2rem 0 0;
    color: #363226;
    font-family: 'Space Grotesk', sans-serif;
  }

  .detail-grid {
    display: grid;
    gap: 0.9rem;
  }

  .panel {
    background: #fff;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #c8baa1;
    padding: 1rem;
  }

  .panel p,
  .panel li {
    color: #3f3528;
    line-height: 1.5;
  }

  .error {
    color: #8b3021;
  }
</style>
