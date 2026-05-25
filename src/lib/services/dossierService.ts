import type { DossierRelationship, DossierMention, DossierType, Entity } from '$lib/types';
import type { AnyDossier, DossierFilter } from '$lib/types/dossier';

// ── IndexedDB wiring ─────────────────────────────────────────────

const DB_NAME = 'DDR_Dossiers';
const DB_VERSION = 1;
const STORE_NAME = 'dossiers';

function generateId(): string {
  return `dossier_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

class DossierStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () =>
        reject(new Error(`Failed to open dossier DB: ${request.error}`));

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private getDB(): IDBDatabase {
    if (!this.db) throw new Error('DossierStorage not initialized');
    return this.db;
  }

  async put(dossier: AnyDossier): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = this.getDB().transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dossier);
      req.onerror = () => reject(new Error(`Failed to save dossier: ${req.error}`));
      req.onsuccess = () => resolve();
    });
  }

  async get(id: string): Promise<AnyDossier | null> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = this.getDB().transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onerror = () => reject(new Error(`Failed to get dossier: ${req.error}`));
      req.onsuccess = () => resolve((req.result as AnyDossier) ?? null);
    });
  }

  async delete(id: string): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = this.getDB().transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onerror = () => reject(new Error(`Failed to delete dossier: ${req.error}`));
      req.onsuccess = () => resolve();
    });
  }

  async listAll(): Promise<AnyDossier[]> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = this.getDB().transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onerror = () => reject(new Error(`Failed to list dossiers: ${req.error}`));
      req.onsuccess = () => resolve((req.result as AnyDossier[]) ?? []);
    });
  }

  async listByType(type: DossierType): Promise<AnyDossier[]> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = this.getDB().transaction([STORE_NAME], 'readonly');
      const index = tx.objectStore(STORE_NAME).index('type');
      const req = index.getAll(type);
      req.onerror = () => reject(new Error(`Failed to list dossiers by type: ${req.error}`));
      req.onsuccess = () => resolve((req.result as AnyDossier[]) ?? []);
    });
  }
}

// ── DossierService ───────────────────────────────────────────────

export class DossierService {
  private storage = new DossierStorage();

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  // ── CRUD ────────────────────────────────────────────────────────

  async createDossier(
    partial: Omit<AnyDossier, 'id' | 'createdAt' | 'updatedAt' | 'relationships' | 'mentions'>
  ): Promise<AnyDossier> {
    const now = Date.now();
    const dossier: AnyDossier = {
      relationships: [],
      mentions: [],
      ...partial,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    } as AnyDossier;

    await this.storage.put(dossier);
    return dossier;
  }

  async readDossier(id: string): Promise<AnyDossier | null> {
    return this.storage.get(id);
  }

  async updateDossier(
    id: string,
    changes: Partial<Omit<AnyDossier, 'id' | 'createdAt' | 'type'>>
  ): Promise<AnyDossier> {
    const existing = await this.storage.get(id);
    if (!existing) throw new Error(`Dossier not found: ${id}`);

    const updated: AnyDossier = {
      ...existing,
      ...changes,
      id,
      createdAt: existing.createdAt,
      updatedAt: Date.now()
    } as AnyDossier;

    await this.storage.put(updated);
    return updated;
  }

  async deleteDossier(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  async listDossiers(filter: DossierFilter = {}): Promise<AnyDossier[]> {
    const { type, search, sortBy = 'updatedAt', sortDir = 'desc', limit } = filter;

    let results = type
      ? await this.storage.listByType(type)
      : await this.storage.listAll();

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
    }

    results.sort((a, b) => {
      const av = a[sortBy] as string | number;
      const bv = b[sortBy] as string | number;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return limit ? results.slice(0, limit) : results;
  }

  // ── Relationships ────────────────────────────────────────────────

  async addRelationship(dossierId: string, rel: DossierRelationship): Promise<AnyDossier> {
    const dossier = await this.storage.get(dossierId);
    if (!dossier) throw new Error(`Dossier not found: ${dossierId}`);

    const already = dossier.relationships.some(r => r.targetDossierId === rel.targetDossierId && r.relationshipType === rel.relationshipType);
    if (already) return dossier;

    return this.updateDossier(dossierId, {
      relationships: [...dossier.relationships, rel]
    });
  }

  async removeRelationship(dossierId: string, targetId: string, relType: string): Promise<AnyDossier> {
    const dossier = await this.storage.get(dossierId);
    if (!dossier) throw new Error(`Dossier not found: ${dossierId}`);

    return this.updateDossier(dossierId, {
      relationships: dossier.relationships.filter(
        r => !(r.targetDossierId === targetId && r.relationshipType === relType)
      )
    });
  }

  // ── Mentions ─────────────────────────────────────────────────────

  async addMention(dossierId: string, mention: DossierMention): Promise<AnyDossier> {
    const dossier = await this.storage.get(dossierId);
    if (!dossier) throw new Error(`Dossier not found: ${dossierId}`);

    const already = dossier.mentions.some(m => m.recordingId === mention.recordingId && m.context === mention.context);
    if (already) return dossier;

    return this.updateDossier(dossierId, {
      mentions: [...dossier.mentions, mention]
    });
  }

  // ── Import from extraction ───────────────────────────────────────

  /**
   * Create or update a dossier from an approved Entity.
   * If a dossier with the same normalised name and type already exists, merge mentions into it.
   * Otherwise create a new dossier.
   */
  async upsertFromEntity(entity: Entity, recordingId: string): Promise<AnyDossier> {
    const all = await this.storage.listAll();
    const normalised = entity.name.trim().toLowerCase();

    const existing = all.find(
      d => d.name.trim().toLowerCase() === normalised && d.type === entity.type
    );

    const newMentions: DossierMention[] = entity.mentions.map(ctx => ({
      recordingId,
      timestamp: Date.now(),
      context: ctx
    }));

    if (existing) {
      // Merge new mention contexts in without duplicates
      const merged = [...existing.mentions];
      for (const m of newMentions) {
        if (!merged.some(em => em.recordingId === m.recordingId && em.context === m.context)) {
          merged.push(m);
        }
      }
      return this.updateDossier(existing.id, {
        description: existing.description || entity.description || '',
        mentions: merged
      });
    }

    return this.createDossier({
      name: entity.name.trim(),
      type: entity.type,
      description: entity.description || '',
      mentions: newMentions
    } as Omit<AnyDossier, 'id' | 'createdAt' | 'updatedAt' | 'relationships' | 'mentions'>);
  }
}

// ── Singleton factory ────────────────────────────────────────────

let instance: DossierService | null = null;

export function createDossierService(): DossierService {
  if (!instance) instance = new DossierService();
  return instance;
}

// Export singleton instance for convenience
export const dossierService = createDossierService();
