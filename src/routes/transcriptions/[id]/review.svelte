<script lang="ts">
  import { onMount } from 'svelte';
  import ExtractionPreview, { type ExtractionDecision } from '../../../components/ExtractionPreview.svelte';
  import MergeConflictResolver from '../../../components/MergeConflictResolver.svelte';
  import type { Entity, Recording } from '$lib/types';
  import { createExtractionService, createStorageService, createMergeService } from '$services';
  import { importEntities } from '$stores/dossierStore';
  import type { MergeConflict } from '$lib/services/mergeService';

  export let recordingId: string;

  type ReviewItem = {
    key: string;
    decision: ExtractionDecision;
    entity: Entity;
  };

  const storageService = createStorageService();
  const extractionService = createExtractionService();
  const mergeService = createMergeService();

  let loading = true;
  let saving = false;
  let error = '';
  let statusMessage = '';

  let recording: Recording | null = null;
  let reviewItems: ReviewItem[] = [];
  let mergeConflicts: MergeConflict[] = [];

  $: acceptedCount = reviewItems.filter((item) => item.decision === 'accepted').length;
  $: rejectedCount = reviewItems.filter((item) => item.decision === 'rejected').length;
  $: pendingCount = reviewItems.filter((item) => item.decision === 'pending').length;

  onMount(async () => {
    await loadReviewData();
  });

  async function loadReviewData(): Promise<void> {
    loading = true;
    error = '';
    statusMessage = '';

    try {
      await storageService.initialize();
      await extractionService.initialize();
      await mergeService.initialize();

      const loadedRecording = await storageService.loadRecording(recordingId);
      if (!loadedRecording) {
        throw new Error(`Recording not found for id: ${recordingId}`);
      }

      recording = loadedRecording;

      reviewItems = await getInitialReviewItems(loadedRecording);
    } catch (err) {
      error = `Unable to load transcription review: ${String(err)}`;
    } finally {
      loading = false;
    }
  }

  async function getInitialReviewItems(target: Recording): Promise<ReviewItem[]> {
    if (target.transcriptionTags && target.transcriptionTags.length > 0) {
      return target.transcriptionTags.map((tag, index) => ({
        key: tag.id ?? `${tag.name}-${index}`,
        decision: tag.status === 'linked' ? 'accepted' : 'pending',
        entity: {
          id: tag.id,
          name: tag.name,
          type: tag.type,
          confidence: tag.confidence,
          mentions: tag.mentionContexts,
          source: tag.source
        }
      }));
    }

    const seedEntities = await getReviewEntities(target);
    return seedEntities.map((entity, index) => ({
      key: entity.id ?? `${entity.name}-${index}`,
      decision: 'pending',
      entity
    }));
  }

  async function getReviewEntities(target: Recording): Promise<Entity[]> {
    if (target.extractedEntities && target.extractedEntities.length > 0) {
      return target.extractedEntities;
    }

    if (!target.transcription?.trim()) {
      return [];
    }

    return extractionService.extractEntities(target.transcription, {
      minConfidence: 30,
      maxEntities: 30
    });
  }

  function onItemUpdate(index: number, updatedEntity: Entity): void {
    reviewItems = reviewItems.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            entity: updatedEntity
          }
        : item
    );
  }

  function onConfirm(index: number): void {
    reviewItems = reviewItems.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            decision: 'accepted'
          }
        : item
    );
  }

  function onReject(index: number): void {
    reviewItems = reviewItems.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            decision: 'rejected'
          }
        : item
    );
  }

  async function saveApprovedExtractions(): Promise<void> {
    if (!recording) {
      return;
    }

    saving = true;
    error = '';
    statusMessage = '';
    mergeConflicts = [];

    try {
      const acceptedEntities = reviewItems
        .filter((item) => item.decision === 'accepted')
        .map((item) => ({
          ...item.entity,
          name: item.entity.name.trim(),
          description: item.entity.description?.trim() || undefined
        }))
        .filter((entity) => entity.name.length > 0);

      const updatedRecording: Recording = {
        ...recording,
        extractedEntities: acceptedEntities
      };

      await storageService.saveRecording(updatedRecording);
      recording = updatedRecording;

      const mergeResult = await importEntities(acceptedEntities, recording.id);
      mergeConflicts = mergeResult.conflicts;

      statusMessage = `Saved ${acceptedEntities.length} approved extraction(s). ` +
        `Dossiers created: ${mergeResult.summary.created}, ` +
        `auto-merged: ${mergeResult.summary.autoMerged}, ` +
        `manual review: ${mergeResult.summary.manualReview}.`;
    } catch (err) {
      error = `Unable to save approved extractions: ${String(err)}`;
    } finally {
      saving = false;
    }
  }

  async function onResolveConflictMerge(conflict: MergeConflict, candidateId: string): Promise<void> {
    try {
      await mergeService.resolveConflict(conflict, 'merge', candidateId);
      mergeConflicts = mergeConflicts.filter((c) => c.id !== conflict.id);
      statusMessage = 'Manual merge decision saved.';
    } catch (err) {
      error = `Unable to resolve merge conflict: ${String(err)}`;
    }
  }

  async function onResolveConflictCreate(conflict: MergeConflict): Promise<void> {
    try {
      await mergeService.resolveConflict(conflict, 'create_new');
      mergeConflicts = mergeConflicts.filter((c) => c.id !== conflict.id);
      statusMessage = 'Created a new dossier from conflict entity.';
    } catch (err) {
      error = `Unable to create dossier from conflict: ${String(err)}`;
    }
  }

  async function onResolveConflictIgnore(conflict: MergeConflict): Promise<void> {
    try {
      await mergeService.resolveConflict(conflict, 'ignore');
      mergeConflicts = mergeConflicts.filter((c) => c.id !== conflict.id);
      statusMessage = 'Conflict ignored.';
    } catch (err) {
      error = `Unable to ignore conflict: ${String(err)}`;
    }
  }
</script>

<div class="review-shell">
  <div class="header-strip">
    <h1>Review Transcription Extraction</h1>
    <p>Recording ID: {recordingId}</p>
  </div>

  {#if error}
    <div class="banner error">{error}</div>
  {/if}

  {#if statusMessage}
    <div class="banner success">{statusMessage}</div>
  {/if}

  {#if mergeConflicts.length > 0}
    <section class="merge-conflicts">
      <div class="panel-title">Manual Merge Review Required</div>
      <div class="merge-list">
        {#each mergeConflicts as conflict (conflict.id)}
          <MergeConflictResolver
            {conflict}
            on:merge={(event) => onResolveConflictMerge(event.detail.conflict, event.detail.candidateId)}
            on:createNew={(event) => onResolveConflictCreate(event.detail.conflict)}
            on:ignore={(event) => onResolveConflictIgnore(event.detail.conflict)}
          />
        {/each}
      </div>
    </section>
  {/if}

  {#if loading}
    <div class="empty-state">Loading transcription and extraction candidates...</div>
  {:else if !recording}
    <div class="empty-state">This transcription could not be loaded.</div>
  {:else}
    <section class="review-grid">
      <article class="panel transcription-panel">
        <div class="panel-title">Transcription Text</div>
        <div class="transcription-content">
          {recording.transcription || 'No transcription text available for this recording.'}
        </div>
      </article>

      <article class="panel extraction-panel">
        <div class="panel-title">Extracted Entities</div>
        <div class="entity-stats">
          <span>Accepted: {acceptedCount}</span>
          <span>Rejected: {rejectedCount}</span>
          <span>Pending: {pendingCount}</span>
        </div>

        {#if reviewItems.length === 0}
          <div class="empty-state compact">No entities available. Run extraction from the recording workflow first.</div>
        {:else}
          <div class="entity-list">
            {#each reviewItems as item, index (item.key)}
              <ExtractionPreview
                entity={item.entity}
                decision={item.decision}
                on:update={(event) => onItemUpdate(index, event.detail.entity)}
                on:confirm={() => onConfirm(index)}
                on:reject={() => onReject(index)}
              />
            {/each}
          </div>
        {/if}
      </article>
    </section>

    <footer class="actions">
      <button class="save-button" type="button" disabled={saving || acceptedCount === 0} on:click={saveApprovedExtractions}>
        {saving ? 'Saving...' : 'Save Approved Extractions'}
      </button>
    </footer>
  {/if}
</div>

<style>
  .review-shell {
    display: grid;
    gap: 0.8rem;
    height: 100%;
    max-height: calc(100vh - 8rem);
  }

  .header-strip {
    background: #eee8d8;
    box-shadow:
      inset 1px 1px 0 #ffffff,
      inset -1px -1px 0 #c7b89f;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    justify-content: space-between;
    padding: 0.7rem 0.9rem;
  }

  h1 {
    color: #3f3528;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.15rem;
    letter-spacing: 0.05em;
    margin: 0;
    text-transform: uppercase;
  }

  .header-strip p {
    color: #6c5b42;
    font-size: 0.82rem;
    margin: 0;
  }

  .merge-conflicts {
    background: #f7f1e6;
    box-shadow:
      inset 1px 1px 0 #ffffff,
      inset -1px -1px 0 #d3c4aa;
    padding: 0.75rem;
    display: grid;
    gap: 0.55rem;
  }

  .merge-list {
    display: grid;
    gap: 0.6rem;
  }

  .banner {
    padding: 0.65rem 0.8rem;
  }

  .banner.error {
    background: #f6ece7;
    color: #5d2f23;
  }

  .banner.success {
    background: #ecf3eb;
    color: #35523a;
  }

  .review-grid {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: 1.15fr 1fr;
    min-height: 0;
  }

  .panel {
    background: #fef9f0;
    box-shadow:
      inset -1px -1px 0 #ffffff,
      inset 1px 1px 0 #c8b99e;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-title {
    background: #eee8d8;
    color: #5f513d;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 0.45rem 0.55rem;
    text-transform: uppercase;
  }

  .transcription-content {
    background: #eee8d8;
    box-shadow:
      inset 1px 1px 0 #b5a88f,
      inset -1px -1px 0 #ffffff;
    font-size: 0.92rem;
    line-height: 1.5;
    margin: 0.8rem;
    min-height: 0;
    overflow: auto;
    padding: 0.7rem;
    white-space: pre-wrap;
  }

  .entity-stats {
    color: #635844;
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    padding: 0.6rem 0.8rem 0;
  }

  .entity-list {
    display: grid;
    gap: 0.6rem;
    margin: 0.6rem 0.8rem 0.8rem;
    overflow: auto;
    padding-right: 0.3rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    padding-bottom: 0.3rem;
  }

  .save-button {
    background: #9a442d;
    border: none;
    box-shadow:
      inset 1px 1px 0 #fff3e8,
      inset -1px -1px 0 #6f2f1f;
    color: #fef9f0;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0.6rem 0.95rem;
    text-transform: uppercase;
  }

  .save-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .save-button:active {
    box-shadow:
      inset -1px -1px 0 #fff3e8,
      inset 1px 1px 0 #6f2f1f;
  }

  .empty-state {
    color: #5d584f;
    font-size: 0.95rem;
    padding: 1rem;
  }

  .empty-state.compact {
    font-size: 0.87rem;
    padding: 0.8rem;
  }

  @media (max-width: 960px) {
    .review-shell {
      max-height: none;
    }

    .review-grid {
      grid-template-columns: 1fr;
    }

    .transcription-content {
      max-height: 15rem;
    }

    .entity-list {
      max-height: 30rem;
    }
  }
</style>
