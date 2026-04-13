<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { DossierRelationship } from '$lib/types';
  import type { AnyDossier, CharacterDossier, LocationDossier, NPCDossier, PlotDossier } from '$lib/types/dossier';
  import { createDossierService } from '$services';
  import { dossiers, ensureLoaded, loadDossiers, updateDossier, deleteDossier } from '$stores/dossierStore';
  import Breadcrumbs from '../../../components/Breadcrumbs.svelte';

  const service = createDossierService();

  const TYPE_LABELS: Record<AnyDossier['type'], string> = {
    NPC: 'NPC Registry',
    PLAYER_CHARACTER: 'Characters',
    LOCATION: 'Locations',
    STORY_PLOT: 'Story Threads'
  };

  const TYPE_TO_SLUG: Record<AnyDossier['type'], string> = {
    NPC: 'npc',
    PLAYER_CHARACTER: 'characters',
    LOCATION: 'locations',
    STORY_PLOT: 'stories'
  };

  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let status = '';

  let dossier: AnyDossier | null = null;
  let lastLoadedId = '';
  let editMode = false;

  // Editable fields
  let name = '';
  let description = '';
  let imageUrl = '';
  let notes = '';

  // NPC-specific
  let npcFaction = '';
  let npcRole = '';
  let npcStatus: 'alive' | 'dead' | 'unknown' = 'unknown';
  let npcLocationsKnown = '';

  // Character-specific
  let pcPlayerName = '';
  let pcClass = '';
  let pcRace = '';
  let pcLevel = '';

  // Location-specific
  let locRegion = '';
  let locType = '';
  let locFeatures = '';

  // Story-specific
  let plotStatus: 'active' | 'resolved' | 'abandoned' = 'active';
  let plotParties = '';

  // Relationships form
  let relTargetId = '';
  let relType = '';
  let relDescription = '';

  $: dossierId = $page.params.id;
  $: breadcrumbs = dossier
    ? [
        { label: 'Home', href: '/' },
        { label: 'Dossiers', href: '/dossiers' },
        { label: TYPE_LABELS[dossier.type], href: `/dossiers?type=${TYPE_TO_SLUG[dossier.type]}` },
        { label: dossier.name }
      ]
    : [
        { label: 'Home', href: '/' },
        { label: 'Dossiers', href: '/dossiers' },
        { label: 'Detail' }
      ];

  $: relatedLookup = new Map(($dossiers || []).map((d) => [d.id, d.name]));
  $: relationTargetOptions = ($dossiers || []).filter((d) => d.id !== dossier?.id);

  onMount(async () => {
    await ensureLoaded();
    await loadCurrentDossier();
  });

  $: if (dossierId && dossierId !== lastLoadedId) {
    void loadCurrentDossier();
  }

  async function loadCurrentDossier(): Promise<void> {
    loading = true;
    error = '';
    status = '';
    try {
      await service.initialize();
      const found = await service.readDossier(dossierId);
      if (!found) {
        throw new Error('Dossier not found.');
      }
      dossier = found;
      lastLoadedId = dossierId;
      hydrateForm(found);
    } catch (err) {
      error = `Unable to load dossier: ${String(err)}`;
      dossier = null;
    } finally {
      loading = false;
    }
  }

  function hydrateForm(d: AnyDossier): void {
    name = d.name;
    description = d.description || '';
    imageUrl = d.imageUrl || '';
    notes = (d as NPCDossier | CharacterDossier | LocationDossier | PlotDossier).notes || '';

    if (d.type === 'NPC') {
      npcFaction = d.faction || '';
      npcRole = d.role || '';
      npcStatus = d.status || 'unknown';
      npcLocationsKnown = (d.locationsKnown || []).join(', ');
    }

    if (d.type === 'PLAYER_CHARACTER') {
      pcPlayerName = d.playerName || '';
      pcClass = d.characterClass || '';
      pcRace = d.race || '';
      pcLevel = d.level ? String(d.level) : '';
    }

    if (d.type === 'LOCATION') {
      locRegion = d.region || '';
      locType = d.locationType || '';
      locFeatures = (d.notableFeatures || []).join(', ');
    }

    if (d.type === 'STORY_PLOT') {
      plotStatus = d.plotStatus || 'active';
      plotParties = (d.partiesInvolved || []).join(', ');
    }
  }

  function splitCsv(value: string): string[] {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  async function saveChanges(): Promise<void> {
    if (!dossier) return;
    saving = true;
    error = '';
    status = '';
    try {
      const baseChanges = {
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined
      };

      let typeSpecific: Record<string, unknown> = {};

      if (dossier.type === 'NPC') {
        typeSpecific = {
          faction: npcFaction.trim() || undefined,
          role: npcRole.trim() || undefined,
          status: npcStatus,
          locationsKnown: splitCsv(npcLocationsKnown),
          notes: notes.trim() || undefined
        };
      }

      if (dossier.type === 'PLAYER_CHARACTER') {
        typeSpecific = {
          playerName: pcPlayerName.trim() || undefined,
          characterClass: pcClass.trim() || undefined,
          race: pcRace.trim() || undefined,
          level: pcLevel.trim() ? Number(pcLevel) : undefined,
          notes: notes.trim() || undefined
        };
      }

      if (dossier.type === 'LOCATION') {
        typeSpecific = {
          region: locRegion.trim() || undefined,
          locationType: locType.trim() || undefined,
          notableFeatures: splitCsv(locFeatures),
          notes: notes.trim() || undefined
        };
      }

      if (dossier.type === 'STORY_PLOT') {
        typeSpecific = {
          plotStatus,
          partiesInvolved: splitCsv(plotParties),
          notes: notes.trim() || undefined
        };
      }

      const updated = await updateDossier(dossier.id, {
        ...baseChanges,
        ...typeSpecific
      } as Partial<Omit<AnyDossier, 'id' | 'createdAt' | 'type'>>);

      dossier = updated;
      status = 'Changes saved.';
      editMode = false;
      await loadDossiers();
    } catch (err) {
      error = `Failed to save dossier: ${String(err)}`;
    } finally {
      saving = false;
    }
  }

  async function addRelationship(): Promise<void> {
    if (!dossier || !relTargetId.trim() || !relType.trim()) return;
    error = '';
    status = '';
    try {
      const nextRel: DossierRelationship = {
        targetDossierId: relTargetId,
        relationshipType: relType.trim(),
        description: relDescription.trim() || undefined
      };

      const existing = dossier.relationships.some(
        (r) => r.targetDossierId === nextRel.targetDossierId && r.relationshipType === nextRel.relationshipType
      );
      if (existing) {
        status = 'Relationship already exists.';
        return;
      }

      const updated = await updateDossier(dossier.id, {
        relationships: [...dossier.relationships, nextRel]
      });

      dossier = updated;
      await loadDossiers();
      relTargetId = '';
      relType = '';
      relDescription = '';
      status = 'Relationship added.';
    } catch (err) {
      error = `Failed to add relationship: ${String(err)}`;
    }
  }

  async function removeRelationship(index: number): Promise<void> {
    if (!dossier) return;
    error = '';
    status = '';
    try {
      const updated = await updateDossier(dossier.id, {
        relationships: dossier.relationships.filter((_, i) => i !== index)
      });
      dossier = updated;
      await loadDossiers();
      status = 'Relationship removed.';
    } catch (err) {
      error = `Failed to remove relationship: ${String(err)}`;
    }
  }

  async function deleteCurrentDossier(): Promise<void> {
    if (!dossier) return;
    const confirmed = confirm(`Delete dossier "${dossier.name}"? This cannot be undone.`);
    if (!confirmed) return;

    deleting = true;
    error = '';
    status = '';
    try {
      await deleteDossier(dossier.id);
      await loadDossiers();
      await goto('/dossiers');
    } catch (err) {
      error = `Failed to delete dossier: ${String(err)}`;
    } finally {
      deleting = false;
    }
  }

  function openMention(mentionRecordingId: string): void {
    goto(`/transcriptions/${mentionRecordingId}`);
  }

  function formatType(type: AnyDossier['type']): string {
    if (type === 'PLAYER_CHARACTER') return 'Player Character';
    if (type === 'STORY_PLOT') return 'Story Plot';
    return type.charAt(0) + type.slice(1).toLowerCase();
  }

  function formatTs(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  function cancelEdit(): void {
    if (!dossier) return;
    hydrateForm(dossier);
    editMode = false;
    status = 'Edit cancelled.';
  }
</script>

<div class="page">
  <Breadcrumbs crumbs={breadcrumbs} />

  <div class="header-strip">
    <div>
      <div class="eyebrow">Dossier Detail</div>
      <h1>{dossier?.name || 'Loading dossier...'}</h1>
      {#if dossier}
        <div class="meta-row">
          <span class="type-pill">{formatType(dossier.type)}</span>
          <span>Created {formatTs(dossier.createdAt)}</span>
          <span>Updated {formatTs(dossier.updatedAt)}</span>
        </div>
      {/if}
    </div>

    {#if dossier}
      <div class="header-actions">
        {#if editMode}
          <button class="btn muted" type="button" on:click={cancelEdit} disabled={saving}>Cancel</button>
          <button class="btn" type="button" on:click={saveChanges} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        {:else}
          <button class="btn muted" type="button" on:click={() => goto('/dossiers?type=' + TYPE_TO_SLUG[dossier.type])}>Back to Type</button>
          <button class="btn" type="button" on:click={() => (editMode = true)}>Edit</button>
        {/if}
        <button class="btn danger" type="button" on:click={deleteCurrentDossier} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</button>
      </div>
    {/if}
  </div>

  {#if loading}
    <section class="panel">Loading dossier...</section>
  {:else if error}
    <section class="panel error">{error}</section>
  {:else if dossier}
    {#if status}
      <section class="panel status">{status}</section>
    {/if}

    <div class="grid-two">
      <section class="panel">
        <h2>Core Fields</h2>
        {#if editMode}
          <label>
            Name
            <input bind:value={name} placeholder="Dossier name" />
          </label>
          <label>
            Description
            <textarea bind:value={description} rows="4" placeholder="Short dossier description"></textarea>
          </label>
          <label>
            Image URL
            <input bind:value={imageUrl} placeholder="Optional image URL" />
          </label>
          <label>
            Notes
            <textarea bind:value={notes} rows="3" placeholder="Extra notes"></textarea>
          </label>
        {:else}
          <div class="kv"><span>Name</span><strong>{dossier.name}</strong></div>
          <div class="kv"><span>Description</span><p>{dossier.description || 'No description.'}</p></div>
          <div class="kv"><span>Image</span><p>{dossier.imageUrl || 'No image URL.'}</p></div>
          <div class="kv"><span>Notes</span><p>{notes || 'No notes.'}</p></div>
        {/if}
      </section>

      <section class="panel">
        <h2>Type-Specific Fields</h2>

        {#if dossier.type === 'NPC'}
          {#if editMode}
            <label>Faction<input bind:value={npcFaction} placeholder="Faction or organization" /></label>
            <label>Role<input bind:value={npcRole} placeholder="Role or occupation" /></label>
            <label>
              Status
              <select bind:value={npcStatus}>
                <option value="alive">Alive</option>
                <option value="dead">Dead</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
            <label>Known Locations (CSV)<input bind:value={npcLocationsKnown} placeholder="Tavern, Waterdeep, Neverwinter" /></label>
          {:else}
            <div class="kv"><span>Faction</span><p>{(dossier as NPCDossier).faction || 'N/A'}</p></div>
            <div class="kv"><span>Role</span><p>{(dossier as NPCDossier).role || 'N/A'}</p></div>
            <div class="kv"><span>Status</span><p>{(dossier as NPCDossier).status || 'unknown'}</p></div>
            <div class="kv"><span>Known Locations</span><p>{((dossier as NPCDossier).locationsKnown || []).join(', ') || 'N/A'}</p></div>
          {/if}
        {/if}

        {#if dossier.type === 'PLAYER_CHARACTER'}
          {#if editMode}
            <label>Player Name<input bind:value={pcPlayerName} placeholder="Player's real name" /></label>
            <label>Class<input bind:value={pcClass} placeholder="Fighter, Rogue, Wizard..." /></label>
            <label>Race<input bind:value={pcRace} placeholder="Elf, Human, Dwarf..." /></label>
            <label>Level<input bind:value={pcLevel} type="number" min="1" max="20" placeholder="1-20" /></label>
          {:else}
            <div class="kv"><span>Player Name</span><p>{(dossier as CharacterDossier).playerName || 'N/A'}</p></div>
            <div class="kv"><span>Class</span><p>{(dossier as CharacterDossier).characterClass || 'N/A'}</p></div>
            <div class="kv"><span>Race</span><p>{(dossier as CharacterDossier).race || 'N/A'}</p></div>
            <div class="kv"><span>Level</span><p>{(dossier as CharacterDossier).level || 'N/A'}</p></div>
          {/if}
        {/if}

        {#if dossier.type === 'LOCATION'}
          {#if editMode}
            <label>Region<input bind:value={locRegion} placeholder="Sword Coast" /></label>
            <label>Location Type<input bind:value={locType} placeholder="Dungeon, Town, Keep..." /></label>
            <label>Notable Features (CSV)<input bind:value={locFeatures} placeholder="Ancient vault, Arcane rift" /></label>
          {:else}
            <div class="kv"><span>Region</span><p>{(dossier as LocationDossier).region || 'N/A'}</p></div>
            <div class="kv"><span>Location Type</span><p>{(dossier as LocationDossier).locationType || 'N/A'}</p></div>
            <div class="kv"><span>Notable Features</span><p>{((dossier as LocationDossier).notableFeatures || []).join(', ') || 'N/A'}</p></div>
          {/if}
        {/if}

        {#if dossier.type === 'STORY_PLOT'}
          {#if editMode}
            <label>
              Plot Status
              <select bind:value={plotStatus}>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </label>
            <label>Parties Involved (CSV)<input bind:value={plotParties} placeholder="Guild, Raven Queen cult" /></label>
          {:else}
            <div class="kv"><span>Status</span><p>{(dossier as PlotDossier).plotStatus || 'active'}</p></div>
            <div class="kv"><span>Parties Involved</span><p>{((dossier as PlotDossier).partiesInvolved || []).join(', ') || 'N/A'}</p></div>
          {/if}
        {/if}
      </section>
    </div>

    <div class="grid-two">
      <section class="panel">
        <h2>Relationships</h2>

        {#if dossier.relationships.length === 0}
          <p class="muted-text">No relationships recorded.</p>
        {:else}
          <ul class="list">
            {#each dossier.relationships as rel, index}
              <li>
                <div>
                  <strong>{rel.relationshipType}</strong>
                  <div>{relatedLookup.get(rel.targetDossierId) || rel.targetDossierId}</div>
                  {#if rel.description}<small>{rel.description}</small>{/if}
                </div>
                <button class="btn tiny danger" type="button" on:click={() => removeRelationship(index)}>Remove</button>
              </li>
            {/each}
          </ul>
        {/if}

        <div class="relationship-form">
          <label>
            Target Dossier
            <select bind:value={relTargetId}>
              <option value="">Select target...</option>
              {#each relationTargetOptions as candidate}
                <option value={candidate.id}>{candidate.name} ({formatType(candidate.type)})</option>
              {/each}
            </select>
          </label>
          <label>
            Relationship Type
            <input bind:value={relType} placeholder="ally, enemy, located_in, serves..." />
          </label>
          <label>
            Description
            <input bind:value={relDescription} placeholder="Optional details" />
          </label>
          <button class="btn" type="button" on:click={addRelationship}>Add Relationship</button>
        </div>
      </section>

      <section class="panel">
        <h2>Mentions</h2>
        {#if dossier.mentions.length === 0}
          <p class="muted-text">No transcriptions linked yet.</p>
        {:else}
          <ul class="list mentions">
            {#each dossier.mentions as mention}
              <li>
                <div>
                  <strong>{formatTs(mention.timestamp)}</strong>
                  <div class="mention-context">{mention.context}</div>
                  <small>Recording: {mention.recordingId}</small>
                </div>
                <button class="btn tiny" type="button" on:click={() => openMention(mention.recordingId)}>Open Transcript</button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .page {
    display: grid;
    gap: 1rem;
    padding: 1.2rem 0 2rem;
  }

  .header-strip {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    background: #eee8d8;
    border-top: 1px solid #fff;
    border-left: 1px solid #fff;
    border-bottom: 2px solid #bcae95;
    border-right: 2px solid #bcae95;
    padding: 1rem;
  }

  .eyebrow {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9a442d;
  }

  h1 {
    margin: 0.35rem 0 0;
    color: #363226;
    font-family: 'Space Grotesk', sans-serif;
  }

  .meta-row {
    margin-top: 0.45rem;
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-size: 0.75rem;
    color: #6b6250;
    font-family: 'Inter', sans-serif;
  }

  .type-pill {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: 1px solid #9a442d;
    color: #9a442d;
    padding: 0.1rem 0.35rem;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .grid-two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }

  .panel {
    background: #fff;
    border-top: 1px solid #f7f1e6;
    border-left: 1px solid #f7f1e6;
    border-bottom: 2px solid #d2c6b1;
    border-right: 2px solid #d2c6b1;
    padding: 1rem;
  }

  .panel h2 {
    margin: 0 0 0.8rem;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5a4f3f;
    font-family: 'Space Grotesk', sans-serif;
  }

  .status {
    color: #4b654e;
    font-weight: 600;
  }

  .error {
    color: #8b3021;
  }

  .kv {
    margin-bottom: 0.7rem;
  }

  .kv span {
    display: block;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.65rem;
    color: #9a442d;
    margin-bottom: 0.15rem;
  }

  .kv p,
  .kv strong,
  .muted-text,
  .list {
    margin: 0;
    font-family: 'Inter', sans-serif;
    color: #3f3528;
    line-height: 1.45;
  }

  label {
    display: grid;
    gap: 0.25rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #6b6250;
    margin-bottom: 0.6rem;
  }

  input,
  textarea,
  select {
    border-top: 2px solid #c7b89f;
    border-left: 2px solid #c7b89f;
    border-bottom: 1px solid #fff;
    border-right: 1px solid #fff;
    background: #fef9f0;
    color: #2e261c;
    font-family: 'Inter', sans-serif;
    padding: 0.45rem 0.5rem;
    font-size: 0.86rem;
  }

  textarea {
    resize: vertical;
  }

  .list {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.55rem;
  }

  .list li {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.55rem;
    background: #fef9f0;
    border-top: 1px solid #fff;
    border-left: 1px solid #fff;
    border-bottom: 1px solid #d6c9b2;
    border-right: 1px solid #d6c9b2;
  }

  .relationship-form {
    margin-top: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px solid #eee8d8;
  }

  .mentions .mention-context {
    margin: 0.2rem 0;
    font-style: italic;
    color: #5d5141;
  }

  .btn {
    border-top: 1px solid #c46a50;
    border-left: 1px solid #c46a50;
    border-bottom: 1px solid #5a2818;
    border-right: 1px solid #5a2818;
    background: #9a442d;
    color: #fef9f0;
    cursor: pointer;
    padding: 0.45rem 0.8rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .btn.muted {
    background: #6b6250;
    border-top-color: #8a806c;
    border-left-color: #8a806c;
    border-bottom-color: #3f392f;
    border-right-color: #3f392f;
  }

  .btn.danger {
    background: #7d2719;
    border-top-color: #a13f2e;
    border-left-color: #a13f2e;
    border-bottom-color: #4d140b;
    border-right-color: #4d140b;
  }

  .btn.tiny {
    padding: 0.3rem 0.55rem;
    font-size: 0.62rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
