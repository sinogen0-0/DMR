<script lang="ts">
  import { onMount } from 'svelte';
  import { createStorageService } from '$services';
  import type { Recording, TranscriptionTag } from '$lib/types';

  type DossierCard = {
    key: string;
    name: string;
    type: TranscriptionTag['type'];
    tags: Array<{
      recordingId: string;
      recordingTimestamp: number;
      status: TranscriptionTag['status'];
      confidence: number;
      snippets: string[];
      transcript: string;
    }>;
  };

  let dossiers: DossierCard[] = [];
  let loading = true;
  let error = '';
  let selectedTranscriptModal: { transcript: string; entityName: string; date: string } | null = null;

  onMount(async () => {
    await loadDossiers();
  });

  function openTranscriptModal(transcript: string, entityName: string, date: string) {
    selectedTranscriptModal = { transcript, entityName, date };
  }

  function closeTranscriptModal() {
    selectedTranscriptModal = null;
  }

  function onModalOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeTranscriptModal();
    }
  }

  async function loadDossiers() {
    loading = true;
    error = '';

    try {
      const storage = createStorageService();
      await storage.initialize();
      const recordings = await storage.listRecordings({ limit: 200 });
      dossiers = buildDossiers(recordings);
    } catch (e) {
      error = `Failed to load dossier links: ${e}`;
    } finally {
      loading = false;
    }
  }

  function buildDossiers(recordings: Recording[]): DossierCard[] {
    const grouped = new Map<string, DossierCard>();

    for (const recording of recordings) {
      const tags = recording.transcriptionTags || [];
      for (const tag of tags) {
        const key = `${tag.type}::${tag.name.toLowerCase()}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            key,
            name: tag.name,
            type: tag.type,
            tags: [],
          });
        }

        const card = grouped.get(key);
        if (!card) continue;

        card.tags.push({
          recordingId: recording.id,
          recordingTimestamp: recording.timestamp,
          status: tag.status,
          confidence: tag.confidence,
          snippets: tag.mentionContexts,
          transcript: recording.transcription || '',
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function typeLabel(type: TranscriptionTag['type']): string {
    if (type === 'PLAYER_CHARACTER') return 'Character';
    if (type === 'LOCATION') return 'Location';
    if (type === 'STORY_PLOT') return 'Story Device';
    return 'NPC';
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
</script>

<div class="dossiers-container">
  <div class="page-header">
    <h2>Dossier Transcript Links</h2>
    <p class="page-desc">Each dossier shows transcript snippets where it appears. Unlinked tags are marked for review.</p>
    <button class="reload-btn" type="button" on:click={loadDossiers}>Reload</button>
  </div>

  {#if loading}
    <div class="panel">Loading dossier links...</div>
  {:else if error}
    <div class="panel error">{error}</div>
  {:else if dossiers.length === 0}
    <div class="panel">No dossier tags found yet. Save a transcription first.</div>
  {:else}
    <div class="dossier-grid">
      {#each dossiers as dossier (dossier.key)}
        <article class="dossier-card">
          <header>
            <h3>{dossier.name}</h3>
            <span class="type-pill">{typeLabel(dossier.type)}</span>
          </header>

          <div class="mentions">
            {#each dossier.tags as mention}
              <div class="mention-row">
                <div class="meta-row">
                  <span>{formatDate(mention.recordingTimestamp)}</span>
                  <span class="status" class:review={mention.status === 'needs_review'}>
                    {mention.status === 'linked' ? 'Linked' : 'Needs review'}
                  </span>
                </div>
                {#if mention.snippets.length > 0}
                  {#each mention.snippets as snippet}
                    <p class="snippet">{snippet}</p>
                  {/each}
                {:else}
                  <p class="snippet">{mention.transcript}</p>
                {/if}
                {#if mention.transcript}
                  <button 
                    class="view-transcript-btn" 
                    type="button"
                    on:click={() => openTranscriptModal(mention.transcript, dossier.name, formatDate(mention.recordingTimestamp))}
                  >
                    View Full Transcript
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

{#if selectedTranscriptModal}
  <div
    class="modal-overlay"
    on:click={onModalOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && closeTranscriptModal()}
    role="button"
    tabindex="0"
  >
    <div class="modal-content" role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-header">
        <h3>{selectedTranscriptModal.entityName}</h3>
        <button class="modal-close" type="button" on:click={closeTranscriptModal}>×</button>
      </div>
      <div class="modal-date">
        {selectedTranscriptModal.date}
      </div>
      <div class="modal-transcript">
        <p>{selectedTranscriptModal.transcript}</p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn" type="button" on:click={closeTranscriptModal}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dossiers-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 2rem;
  }

  .page-header h2 {
    font-family: 'Space Grotesk', sans-serif;
    margin: 0;
    color: #363226;
  }

  .page-desc {
    font-family: 'Inter', sans-serif;
    color: #6b6250;
    margin: 0.25rem 0 0.75rem;
  }

  .reload-btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.45rem 0.9rem;
    cursor: pointer;
    background: #9a442d;
    color: #fef9f0;
    border-top: 1px solid #c46a50;
    border-left: 1px solid #c46a50;
    border-bottom: 1px solid #5a2818;
    border-right: 1px solid #5a2818;
  }

  .panel {
    background: #ffffff;
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 1px solid #363226;
    border-right: 1px solid #363226;
    padding: 1rem;
    color: #6b6250;
    font-family: 'Inter', sans-serif;
  }

  .panel.error {
    border-left: 4px solid #9a442d;
    color: #9a442d;
  }

  .dossier-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
    gap: 1rem;
  }

  .dossier-card {
    background: #ffffff;
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 1px solid #363226;
    border-right: 1px solid #363226;
    padding: 1rem;
  }

  .dossier-card header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .dossier-card h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    margin: 0;
    color: #363226;
  }

  .type-pill {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.4rem;
    border: 1px solid #d4a574;
    color: #7d6c47;
    background: #fff7ec;
  }

  .mentions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mention-row {
    border-left: 3px solid #d1dbe8;
    background: #f8fbff;
    padding: 0.5rem 0.6rem;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #6b6250;
    margin-bottom: 0.35rem;
  }

  .status {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #4b654e;
    font-weight: 600;
  }

  .status.review {
    color: #9a442d;
  }

  .snippet {
    margin: 0.3rem 0;
    font-family: 'Inter', sans-serif;
    font-size: 0.875rem;
    line-height: 1.45;
    color: #363226;
  }

  .view-transcript-btn {
    margin-top: 0.5rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    background: #d4a574;
    color: #ffffff;
    border-top: 1px solid #e8c8a0;
    border-left: 1px solid #e8c8a0;
    border-bottom: 1px solid #8b6f4a;
    border-right: 1px solid #8b6f4a;
    transition: all 0.15s ease;
  }

  .view-transcript-btn:hover {
    background: #c9985f;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: #ffffff;
    border-top: 1px solid #eee8d8;
    border-left: 1px solid #eee8d8;
    border-bottom: 1px solid #363226;
    border-right: 1px solid #363226;
    border-radius: 2px;
    max-width: 700px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #eee8d8;
  }

  .modal-header h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.25rem;
    margin: 0;
    color: #363226;
    flex: 1;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #6b6250;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease;
  }

  .modal-close:hover {
    color: #363226;
  }

  .modal-date {
    padding: 0.5rem 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.75rem;
    color: #9a9080;
    border-bottom: 1px solid #f0e8d8;
  }

  .modal-transcript {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #363226;
  }

  .modal-transcript p {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .modal-footer {
    padding: 1rem;
    border-top: 1px solid #eee8d8;
    display: flex;
    justify-content: flex-end;
  }

  .modal-btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.45rem 0.9rem;
    cursor: pointer;
    background: #9a442d;
    color: #fef9f0;
    border-top: 1px solid #c46a50;
    border-left: 1px solid #c46a50;
    border-bottom: 1px solid #5a2818;
    border-right: 1px solid #5a2818;
    transition: all 0.15s ease;
  }

  .modal-btn:hover {
    background: #8a3820;
  }
</style>
