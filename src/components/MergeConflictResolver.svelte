<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { MergeConflict } from '$lib/services/mergeService';

  export let conflict: MergeConflict;

  const dispatch = createEventDispatcher<{
    merge: { conflict: MergeConflict; candidateId: string };
    createNew: { conflict: MergeConflict };
    ignore: { conflict: MergeConflict };
  }>();

  function mergeInto(candidateId: string): void {
    dispatch('merge', { conflict, candidateId });
  }

  function createNew(): void {
    dispatch('createNew', { conflict });
  }

  function ignore(): void {
    dispatch('ignore', { conflict });
  }
</script>

<article class="conflict-card">
  <header class="conflict-head">
    <h3>Merge Review: {conflict.entity.name}</h3>
    <span class="badge">{conflict.entity.type}</span>
  </header>

  <p class="hint">Similarity is below 90%, so this extraction needs your merge decision.</p>

  <div class="candidate-list">
    {#each conflict.candidates as candidate}
      <div class="candidate-row">
        <div>
          <div class="candidate-name">{candidate.dossier.name}</div>
          <div class="candidate-meta">Similarity: {candidate.similarity}%</div>
        </div>
        <button class="btn merge" type="button" on:click={() => mergeInto(candidate.dossier.id)}>
          Merge Into This
        </button>
      </div>
    {/each}
  </div>

  <footer class="actions">
    <button class="btn secondary" type="button" on:click={createNew}>Create New Dossier</button>
    <button class="btn subtle" type="button" on:click={ignore}>Ignore</button>
  </footer>
</article>

<style>
  .conflict-card {
    background: #fff9ef;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #d5c5a9;
    padding: 0.75rem;
    display: grid;
    gap: 0.6rem;
  }

  .conflict-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h3 {
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge {
    font-size: 0.7rem;
    color: #6c5b42;
  }

  .hint {
    margin: 0;
    font-size: 0.8rem;
    color: #6c5b42;
  }

  .candidate-list {
    display: grid;
    gap: 0.45rem;
  }

  .candidate-row {
    background: #eee8d8;
    box-shadow: inset -1px -1px 0 #fff, inset 1px 1px 0 #c7b89f;
    padding: 0.45rem 0.55rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
  }

  .candidate-name {
    font-size: 0.82rem;
    font-weight: 600;
  }

  .candidate-meta {
    font-size: 0.73rem;
    color: #6c5b42;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn {
    border: none;
    padding: 0.4rem 0.65rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
  }

  .btn.merge {
    background: #9a442d;
    color: #fef9f0;
    box-shadow: inset 1px 1px 0 #c4614a, inset -1px -1px 0 #6b2e1e;
  }

  .btn.secondary {
    background: #4b654e;
    color: #fef9f0;
    box-shadow: inset 1px 1px 0 #618466, inset -1px -1px 0 #2f4032;
  }

  .btn.subtle {
    background: #eee8d8;
    color: #363226;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #bcae93;
  }
</style>
