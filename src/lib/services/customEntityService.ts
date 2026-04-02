/**
 * Custom Entity Service
 * Manages user-added entity lists (Characters, NPCs, Locations, Story Objects)
 * Persisted in IndexedDB for offline use
 */

import type { CustomEntity, DossierType } from '$lib/types';

const DB_NAME = 'dungeon-deck-entities';
const DB_VERSION = 1;
const STORE_NAME = 'custom_entities';

class CustomEntityService {
  private db: IDBDatabase | null = null;
  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by_type', 'type', { unique: false });
          store.createIndex('by_name', 'name', { unique: false });
          store.createIndex('by_created', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.ready = true;
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to open custom entities database'));
      };
    });
  }

  private ensureReady(): IDBDatabase {
    if (!this.db) throw new Error('CustomEntityService not initialized');
    return this.db;
  }

  /**
   * Add a new entity by name and type
   */
  async addEntity(name: string, type: DossierType, notes?: string): Promise<CustomEntity> {
    const db = this.ensureReady();
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Entity name cannot be empty');

    // Check for duplicate name+type
    const existing = await this.findByNameAndType(trimmedName, type);
    if (existing) {
      throw new Error(`"${trimmedName}" already exists in ${this.typeLabel(type)}`);
    }

    const entity: CustomEntity = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedName,
      type,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(entity);
      tx.oncomplete = () => resolve(entity);
      tx.onerror = () => reject(new Error('Failed to add entity'));
    });
  }

  /**
   * Remove an entity by ID
   */
  async removeEntity(id: string): Promise<void> {
    const db = this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to remove entity'));
    });
  }

  /**
   * Update an entity's name or notes
   */
  async updateEntity(id: string, updates: Partial<Pick<CustomEntity, 'name' | 'notes'>>): Promise<CustomEntity> {
    const db = this.ensureReady();
    const existing = await this.getEntity(id);
    if (!existing) throw new Error('Entity not found');

    const updated: CustomEntity = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(updated);
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(new Error('Failed to update entity'));
    });
  }

  /**
   * Get a single entity by ID
   */
  async getEntity(id: string): Promise<CustomEntity | undefined> {
    const db = this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result || undefined);
      request.onerror = () => reject(new Error('Failed to get entity'));
    });
  }

  /**
   * List all entities, optionally filtered by type
   */
  async listEntities(type?: DossierType): Promise<CustomEntity[]> {
    const db = this.ensureReady();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      let request: IDBRequest;
      if (type) {
        const index = store.index('by_type');
        request = index.getAll(type);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const results = (request.result as CustomEntity[]).sort((a, b) => a.name.localeCompare(b.name));
        resolve(results);
      };
      request.onerror = () => reject(new Error('Failed to list entities'));
    });
  }

  /**
   * Get all entity names grouped by type (for feeding into extraction)
   */
  async getEntityNamesByType(): Promise<Record<DossierType, string[]>> {
    const all = await this.listEntities();
    const grouped: Record<DossierType, string[]> = {
      PLAYER_CHARACTER: [],
      NPC: [],
      LOCATION: [],
      STORY_PLOT: []
    };

    for (const entity of all) {
      grouped[entity.type].push(entity.name);
    }

    return grouped;
  }

  /**
   * Find entity by exact name and type (for duplicate detection)
   */
  private async findByNameAndType(name: string, type: DossierType): Promise<CustomEntity | undefined> {
    const entities = await this.listEntities(type);
    return entities.find(e => e.name.toLowerCase() === name.toLowerCase());
  }

  private typeLabel(type: DossierType): string {
    switch (type) {
      case 'PLAYER_CHARACTER': return 'Characters';
      case 'NPC': return 'NPCs';
      case 'LOCATION': return 'Locations';
      case 'STORY_PLOT': return 'Story Devices';
    }
  }
}

let instance: CustomEntityService | null = null;

export function createCustomEntityService(): CustomEntityService {
  if (!instance) {
    instance = new CustomEntityService();
  }
  return instance;
}
