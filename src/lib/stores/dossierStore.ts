import { writable, derived, get } from 'svelte/store';
import { createDossierService } from '$lib/services/dossierService';
import { createMergeService } from '$lib/services/mergeService';
import type { AnyDossier, DossierFilter } from '$lib/types/dossier';
import type { DossierType, Entity } from '$lib/types';
import type { MergeBatchResult } from '$lib/services/mergeService';

// ── Internal state ───────────────────────────────────────────────

const _dossiers = writable<AnyDossier[]>([]);
const _loading = writable(false);
const _error = writable<string | null>(null);

let _initialized = false;

function getService() {
  return createDossierService();
}

function getMergeService() {
  return createMergeService();
}

// ── Public readable stores ───────────────────────────────────────

export const dossiers = { subscribe: _dossiers.subscribe };
export const dossiersLoading = { subscribe: _loading.subscribe };
export const dossiersError = { subscribe: _error.subscribe };

/** Derived store: dossiers grouped by type */
export const dossiersByType = derived(_dossiers, ($list) => {
  const groups: Record<DossierType, AnyDossier[]> = {
    NPC: [],
    PLAYER_CHARACTER: [],
    LOCATION: [],
    STORY_PLOT: []
  };
  for (const d of $list) {
    groups[d.type].push(d);
  }
  return groups;
});

// ── Actions ──────────────────────────────────────────────────────

/** Load all dossiers (or filtered subset) from IndexedDB into the store. */
export async function loadDossiers(filter: DossierFilter = {}): Promise<void> {
  _loading.set(true);
  _error.set(null);
  try {
    const service = getService();
    await service.initialize();
    const results = await service.listDossiers(filter);
    _dossiers.set(results);
    _initialized = true;
  } catch (e) {
    _error.set(e instanceof Error ? e.message : 'Failed to load dossiers');
  } finally {
    _loading.set(false);
  }
}

/** Ensure dossiers are loaded at least once. */
export async function ensureLoaded(): Promise<void> {
  if (!_initialized) await loadDossiers();
}

/** Create a new dossier and add it to the store. */
export async function createDossier(
  partial: Omit<AnyDossier, 'id' | 'createdAt' | 'updatedAt' | 'relationships' | 'mentions'>
): Promise<AnyDossier> {
  const service = getService();
  await service.initialize();
  const created = await service.createDossier(partial);
  _dossiers.update(list => [created, ...list]);
  return created;
}

/** Update an existing dossier in IndexedDB and in the store. */
export async function updateDossier(
  id: string,
  changes: Partial<Omit<AnyDossier, 'id' | 'createdAt' | 'type'>>
): Promise<AnyDossier> {
  const service = getService();
  await service.initialize();
  const updated = await service.updateDossier(id, changes);
  _dossiers.update(list => list.map(d => (d.id === id ? updated : d)));
  return updated;
}

/** Delete a dossier from IndexedDB and remove it from the store. */
export async function deleteDossier(id: string): Promise<void> {
  const service = getService();
  await service.initialize();
  await service.deleteDossier(id);
  _dossiers.update(list => list.filter(d => d.id !== id));
}

/**
 * Import approved entities from review into dossiers using merge rules.
 * >=90 similarity auto-merges, near matches are returned as manual conflicts.
 */
export async function importEntities(entities: Entity[], recordingId: string): Promise<MergeBatchResult> {
  const service = getService();
  const mergeService = getMergeService();
  await service.initialize();
  await mergeService.initialize();
  _loading.set(true);
  _error.set(null);

  try {
    const results = await mergeService.processEntities(entities, recordingId);

    // Refresh the store after bulk import
    const all = await service.listDossiers();
    _dossiers.set(all);
    _initialized = true;

    return results;
  } catch (e) {
    _error.set(e instanceof Error ? e.message : 'Failed to import entities');
    return {
      dossiers: [],
      conflicts: [],
      summary: {
        created: 0,
        autoMerged: 0,
        manualReview: 0
      }
    };
  } finally {
    _loading.set(false);
  }
}

/** Get a single dossier from the in-memory store by id (no async). */
export function getDossierById(id: string): AnyDossier | undefined {
  return get(_dossiers).find(d => d.id === id);
}
