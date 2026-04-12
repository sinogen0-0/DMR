<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import DossierModal from '../../../components/DossierModal.svelte';
  import { createStorageService } from '$services';
  import { loadDossiers, dossiers } from '$stores/dossierStore';
  import { buildLinkedTranscript } from '$lib/utils/entityLinking';
  import type { Recording } from '$lib/types';
  import type { AnyDossier } from '$lib/types/dossier';

  const storageService = createStorageService();

  let loading = true;
  let error = '';
  let recording: Recording | null = null;
  let linkedSegments = [{ text: '' }];
  let selectedDossier: AnyDossier | null = null;
  let allDossiers: AnyDossier[] = [];

  $: recordingId = $page.params.id;
  $: linkedSegments = buildLinkedTranscript(recording?.transcription || '', allDossiers);
  $: if ($dossiers) {
    allDossiers = $dossiers;
  }

  onMount(async () => {
    await loadPage();
  });

  async function loadPage(): Promise<void> {
    loading = true;
    error = '';

    try {
      await storageService.initialize();
      await loadDossiers();
      const loaded = await storageService.loadRecording(recordingId);
      if (!loaded || !loaded.transcription) {
        throw new Error('Transcription not found for this recording.');
      }
      recording = loaded;
    } catch (err) {
      error = `Unable to load transcription view: ${String(err)}`;
    } finally {
      loading = false;
    }
  }

  function openDossier(dossierId: string | undefined): void {
    if (!dossierId) return;
    selectedDossier = allDossiers.find((item) => item.id === dossierId) ?? null;
  }

  function closeDossier(): void {
    selectedDossier = null;
  }

  function typeLabel(type: string): string {
    if (type === 'PLAYER_CHARACTER') return 'Character';
    if (type === 'STORY_PLOT') return 'Story Plot';
    return type.charAt(0) + type.slice(1).toLowerCase();
  }
</script>

<div class="transcription-view">
  <div class="header-strip">
    <div>
      <div class="eyebrow">Transcriptions</div>
      <h1>Linked Transcript Viewer</h1>
      <p>{recording ? new Date(recording.timestamp).toLocaleString() : `Recording ${recordingId}`}</p>
    </div>
    <div class="header-actions">
      <button class="secondary-button" type="button" on:click={() => goto('/recording')}>Back to Recordings</button>
      <button class="primary-button" type="button" on:click={() => goto(`/transcriptions/${recordingId}/review`)}>Review Extractions</button>
    </div>
  </div>

  {#if loading}
    <div class="panel">Loading transcript...</div>
  {:else if error}
    <div class="panel error">{error}</div>
  {:else if !recording}
    <div class="panel">No transcription loaded.</div>
  {:else}
    <div class="viewer-grid">
      <article class="panel transcript-panel">
        <div class="panel-title">Transcript</div>
        <div class="transcript-body">
          {#each linkedSegments as segment, index (`${segment.text}-${index}`)}
            {#if segment.dossierId}
              <button class="linked-entity" type="button" on:click={() => openDossier(segment.dossierId)}>
                {segment.text}
              </button>
            {:else}
              <span>{segment.text}</span>
            {/if}
          {/each}
        </div>
      </article>

      <aside class="panel sidebar-panel">
        <div class="panel-title">Dossier Mentions</div>
        {#if recording.transcriptionTags && recording.transcriptionTags.length > 0}
          <div class="tag-list">
            {#each recording.transcriptionTags as tag}
              <button
                class="tag-chip"
                type="button"
                on:click={() => openDossier(allDossiers.find((item) => item.name.toLowerCase() === tag.name.toLowerCase() && item.type === tag.type)?.id)}
              >
                <span>{tag.name}</span>
                <span>{typeLabel(tag.type)}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="empty-copy">No transcription tags were saved for this recording.</p>
        {/if}
      </aside>
    </div>
  {/if}
</div>

{#if selectedDossier}
  <DossierModal dossier={selectedDossier} on:close={closeDossier} />
{/if}

<style>
  .transcription-view {
    display: grid;
    gap: 0.9rem;
    padding: 1rem 0 2rem;
  }

  .header-strip {
    background: #eee8d8;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #c7b89f;
    padding: 0.85rem 1rem;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .eyebrow,
  .panel-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9a442d;
  }

  h1 {
    margin: 0.2rem 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.25rem;
    color: #363226;
  }

  .header-strip p,
  .empty-copy {
    margin: 0;
    color: #6b6250;
    font-size: 0.85rem;
  }

  .header-actions {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
    align-items: start;
  }

  .primary-button,
  .secondary-button,
  .tag-chip,
  .linked-entity {
    border: none;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
  }

  .primary-button,
  .secondary-button {
    padding: 0.5rem 0.85rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .primary-button {
    background: #9a442d;
    color: #fef9f0;
    box-shadow: inset 1px 1px 0 #c4614a, inset -1px -1px 0 #6b2e1e;
  }

  .secondary-button {
    background: #eee8d8;
    color: #363226;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #b8ad98;
  }

  .viewer-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.8fr);
    gap: 0.9rem;
  }

  .panel {
    background: #fff;
    box-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #c8baa1;
    padding: 1rem;
    display: grid;
    gap: 0.8rem;
  }

  .transcript-body {
    font-size: 1rem;
    line-height: 1.9;
    color: #3f3528;
    white-space: pre-wrap;
  }

  .linked-entity {
    display: inline;
    background: #efe4c7;
    color: #7f331f;
    box-shadow: inset 0 -1px 0 #c47e45;
    padding: 0.05rem 0.2rem;
    margin: 0 0.05rem;
    font-size: inherit;
    line-height: inherit;
  }

  .linked-entity:hover {
    background: #e6d2a4;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-chip {
    display: inline-flex;
    flex-direction: column;
    align-items: start;
    gap: 0.15rem;
    background: #f7f1e6;
    color: #363226;
    padding: 0.5rem 0.6rem;
    box-shadow: inset -1px -1px 0 #fff, inset 1px 1px 0 #d0c3ac;
    font-size: 0.74rem;
  }

  .error {
    color: #8b3021;
  }

  @media (max-width: 920px) {
    .viewer-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
