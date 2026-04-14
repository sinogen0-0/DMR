<script lang="ts">
  import type { AnyDossier } from '$lib/types/dossier';
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';

  export let dossier: AnyDossier;

  const dispatch = createEventDispatcher<{ close: void }>();

  function close(): void {
    dispatch('close');
  }

  function onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  async function openFullDossier(): Promise<void> {
    await goto(`/dossiers/${dossier.id}`);
  }

  function formatType(type: AnyDossier['type']): string {
    if (type === 'PLAYER_CHARACTER') return 'Character';
    if (type === 'STORY_PLOT') return 'Story Plot';
    return type.charAt(0) + type.slice(1).toLowerCase();
  }
</script>

<div
  class="modal-overlay"
  role="button"
  tabindex="0"
  on:click={onOverlayClick}
  on:keydown={(event) => event.key === 'Escape' && close()}
>
  <aside class="modal-shell" role="dialog" aria-modal="true" aria-label={`Dossier preview for ${dossier.name}`}>
    <header class="modal-header">
      <div>
        <div class="eyebrow">Dossier Preview</div>
        <h2>{dossier.name}</h2>
      </div>
      <button class="close-button" type="button" on:click={close}>×</button>
    </header>

    <div class="meta-row">
      <span class="type-pill">{formatType(dossier.type)}</span>
      <span class="meta-chip">Mentions: {dossier.mentions.length}</span>
      <span class="meta-chip">Updated: {new Date(dossier.updatedAt).toLocaleDateString()}</span>
    </div>

    <section class="content-panel">
      <div class="section-label">Summary</div>
      <p class="body-copy">{dossier.description || 'No dossier summary saved yet.'}</p>
    </section>

    <section class="content-panel">
      <div class="section-label">Relationships</div>
      {#if dossier.relationships.length === 0}
        <p class="body-copy muted">No linked entities recorded yet.</p>
      {:else}
        <div class="relationship-list">
          {#each dossier.relationships.slice(0, 4) as relationship}
            <div class="relationship-row">
              <span>{relationship.relationshipType}</span>
              <span class="muted">{relationship.targetDossierId}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <footer class="modal-actions">
      <button class="action-button secondary" type="button" on:click={close}>Close</button>
      <button class="action-button primary" type="button" on:click={openFullDossier}>Open Full Dossier</button>
    </footer>
  </aside>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(54, 50, 38, 0.32);
    backdrop-filter: blur(6px);
    display: flex;
    justify-content: flex-end;
    padding: 1.5rem;
    z-index: 40;
  }

  .modal-shell {
    width: min(28rem, 100%);
    height: fit-content;
    max-height: 100%;
    overflow: auto;
    background: #fef9f0;
    box-shadow:
      0 0 24px rgba(54, 50, 38, 0.06),
      inset 1px 1px 0 #ffffff,
      inset -1px -1px 0 #c8baa1;
    padding: 1rem;
    display: grid;
    gap: 0.85rem;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
  }

  .eyebrow,
  .section-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a442d;
  }

  h2 {
    margin: 0.2rem 0 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.2rem;
    color: #363226;
  }

  .close-button {
    border: none;
    background: #eee8d8;
    color: #363226;
    width: 2rem;
    height: 2rem;
    font-size: 1.2rem;
    cursor: pointer;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #b8ad98;
  }

  .meta-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .type-pill,
  .meta-chip {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.28rem 0.5rem;
    background: #eee8d8;
    color: #4c4132;
    box-shadow: inset -1px -1px 0 #fff, inset 1px 1px 0 #c4b89e;
  }

  .content-panel {
    background: #f7f1e6;
    box-shadow: inset -1px -1px 0 #ffffff, inset 1px 1px 0 #d5c8b2;
    padding: 0.8rem;
    display: grid;
    gap: 0.45rem;
  }

  .body-copy {
    margin: 0;
    font-size: 0.92rem;
    color: #3f3528;
    line-height: 1.5;
  }

  .muted {
    color: #7f715c;
  }

  .relationship-list {
    display: grid;
    gap: 0.4rem;
  }

  .relationship-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.82rem;
    color: #3f3528;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.55rem;
  }

  .action-button {
    border: none;
    cursor: pointer;
    padding: 0.5rem 0.9rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .action-button.primary {
    background: #9a442d;
    color: #fef9f0;
    box-shadow: inset 1px 1px 0 #c4614a, inset -1px -1px 0 #6b2e1e;
  }

  .action-button.secondary {
    background: #eee8d8;
    color: #363226;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #b8ad98;
  }

  @media (max-width: 720px) {
    .modal-overlay {
      justify-content: center;
      padding: 0.75rem;
    }

    .modal-shell {
      width: 100%;
    }
  }
</style>
