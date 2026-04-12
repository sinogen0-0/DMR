<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DossierType, Entity } from '$lib/types';

  export type ExtractionDecision = 'pending' | 'accepted' | 'rejected';

  export let entity: Entity;
  export let decision: ExtractionDecision = 'pending';

  const dispatch = createEventDispatcher<{
    update: { entity: Entity };
    confirm: { entity: Entity };
    reject: { entity: Entity };
  }>();

  const dossierTypeOptions: Array<{ value: DossierType; label: string }> = [
    { value: 'NPC', label: 'NPC' },
    { value: 'PLAYER_CHARACTER', label: 'Player Character' },
    { value: 'LOCATION', label: 'Location' },
    { value: 'STORY_PLOT', label: 'Story Plot' }
  ];

  function updateField<K extends keyof Entity>(field: K, value: Entity[K]) {
    dispatch('update', {
      entity: {
        ...entity,
        [field]: value
      }
    });
  }

  function confirmEntity() {
    dispatch('confirm', { entity });
  }

  function rejectEntity() {
    dispatch('reject', { entity });
  }
</script>

<article class="preview-card {decision}">
  <div class="header-strip">
    <span class="label">Extraction Candidate</span>
    <span class="confidence">{entity.confidence}% confidence</span>
  </div>

  <div class="fields">
    <label class="field-label" for={`name-${entity.id ?? entity.name}`}>Entity Name</label>
    <input
      id={`name-${entity.id ?? entity.name}`}
      class="inset-field"
      type="text"
      value={entity.name}
      on:input={(event) => updateField('name', (event.currentTarget as HTMLInputElement).value)}
    />

    <label class="field-label" for={`type-${entity.id ?? entity.name}`}>Dossier Type</label>
    <select
      id={`type-${entity.id ?? entity.name}`}
      class="inset-field"
      value={entity.type}
      on:change={(event) => updateField('type', (event.currentTarget as HTMLSelectElement).value as DossierType)}
    >
      {#each dossierTypeOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>

    <label class="field-label" for={`description-${entity.id ?? entity.name}`}>Description</label>
    <textarea
      id={`description-${entity.id ?? entity.name}`}
      class="inset-field"
      rows="3"
      value={entity.description ?? ''}
      on:input={(event) =>
        updateField('description', (event.currentTarget as HTMLTextAreaElement).value || undefined)}
      placeholder="Optional dossier note for Step 8 handoff"
    ></textarea>

    <div class="mentions">
      <span class="field-label">Mentions</span>
      {#if entity.mentions.length > 0}
        <ul>
          {#each entity.mentions.slice(0, 3) as mention}
            <li>{mention}</li>
          {/each}
        </ul>
      {:else}
        <p class="empty">No mention contexts found.</p>
      {/if}
    </div>
  </div>

  <div class="actions">
    <button type="button" class="btn-outset btn-confirm" on:click={confirmEntity}>Confirm</button>
    <button type="button" class="btn-outset btn-reject" on:click={rejectEntity}>Reject</button>
  </div>
</article>

<style>
  .preview-card {
    background: #fef9f0;
    box-shadow:
      inset 1px 1px 0 #ffffff,
      inset -1px -1px 0 #c6b69a;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 0.8rem;
  }

  .preview-card.accepted {
    background: #f3f8f3;
  }

  .preview-card.rejected {
    background: #f6ece7;
    opacity: 0.78;
  }

  .header-strip {
    align-items: center;
    background: #eee8d8;
    display: flex;
    justify-content: space-between;
    padding: 0.45rem 0.55rem;
  }

  .label {
    color: #5b4f3a;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.73rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .confidence {
    color: #3f3a2f;
    font-size: 0.77rem;
  }

  .fields {
    display: grid;
    gap: 0.4rem;
  }

  .field-label {
    color: #6a553f;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .inset-field {
    background: #eee8d8;
    border: none;
    box-shadow:
      inset 1px 1px 0 #b7a98e,
      inset -1px -1px 0 #ffffff;
    color: #363226;
    font: inherit;
    padding: 0.5rem;
    width: 100%;
  }

  .inset-field:focus {
    outline: 2px solid #9a442d;
    outline-offset: 0;
  }

  .mentions ul {
    display: grid;
    gap: 0.3rem;
    list-style: square;
    margin: 0;
    padding-left: 1rem;
  }

  .mentions li,
  .empty {
    color: #5a5449;
    font-size: 0.84rem;
    line-height: 1.3;
  }

  .empty {
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 0.55rem;
  }

  .btn-outset {
    border: none;
    box-shadow:
      inset 1px 1px 0 #ffffff,
      inset -1px -1px 0 #8e7d63;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0.5rem 0.6rem;
    text-transform: uppercase;
  }

  .btn-outset:active {
    box-shadow:
      inset -1px -1px 0 #ffffff,
      inset 1px 1px 0 #8e7d63;
  }

  .btn-confirm {
    background: #9a442d;
    color: #fef9f0;
  }

  .btn-reject {
    background: #d8b18e;
    color: #4a3526;
  }
</style>
