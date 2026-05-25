/**
 * Embedding Service
 * Generates and manages vector embeddings for semantic search using Transformers.js
 * 
 * OFFLINE MODE: Model files are bundled in static/models/
 * Run `npm run download:ml-model` to download model files for offline use
 */

import { pipeline, env } from '@xenova/transformers';
import type { AnyDossier } from '../types/dossier';

// Enable local model loading for offline operation
// Model files are served from /models/ (bundled in static/models/)
env.allowLocalModels = true;
env.localModelPath = '/models/';
env.useBrowserCache = true; // Cache model in browser storage for faster subsequent loads

interface DossierEmbedding {
  dossierId: string;
  embedding: number[];
  text: string;
  updatedAt: Date;
}

class EmbeddingService {
  private model: any = null;
  private modelLoading: Promise<void> | null = null;
  private dbName = 'DMR_Embeddings';
  private storeName = 'embeddings';
  private db: IDBDatabase | null = null;

  /**
   * Initialize the embedding model (all-MiniLM-L6-v2)
   */
  async initialize(): Promise<void> {
    if (this.model) return;
    if (this.modelLoading) return this.modelLoading;

    this.modelLoading = (async () => {
      console.log('[EmbeddingService] Loading model...');
      this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('[EmbeddingService] Model loaded successfully');
      await this.initDB();
    })();

    return this.modelLoading;
  }

  /**
   * Initialize IndexedDB for storing embeddings
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'dossierId' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.model) {
      await this.initialize();
    }

    const output = await this.model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  /**
   * Generate embedding for a dossier (combines name + description)
   */
  async generateDossierEmbedding(dossier: AnyDossier): Promise<DossierEmbedding> {
    const text = `${dossier.name} ${dossier.description || ''}`.trim();
    const embedding = await this.generateEmbedding(text);

    return {
      dossierId: dossier.id,
      embedding,
      text,
      updatedAt: new Date(dossier.updatedAt),
    };
  }

  /**
   * Store embedding in IndexedDB
   */
  async storeEmbedding(dossierEmbedding: DossierEmbedding): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(dossierEmbedding);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get embedding from IndexedDB
   */
  async getEmbedding(dossierId: string): Promise<DossierEmbedding | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(dossierId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Get all embeddings from IndexedDB
   */
  async getAllEmbeddings(): Promise<DossierEmbedding[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Index a dossier (generate and store embedding)
   */
  async indexDossier(dossier: AnyDossier): Promise<void> {
    const existing = await this.getEmbedding(dossier.id);
    const dossierUpdatedAt = new Date(dossier.updatedAt);

    // Skip if embedding is up-to-date
    if (existing && existing.updatedAt >= dossierUpdatedAt) {
      return;
    }

    const embedding = await this.generateDossierEmbedding(dossier);
    await this.storeEmbedding(embedding);
  }

  /**
   * Index multiple dossiers
   */
  async indexDossiers(dossiers: AnyDossier[]): Promise<void> {
    await this.initialize();

    for (const dossier of dossiers) {
      await this.indexDossier(dossier);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search for similar dossiers using semantic similarity
   */
  async semanticSearch(
    query: string,
    limit: number = 5
  ): Promise<Array<{ dossierId: string; similarity: number; text: string }>> {
    await this.initialize();

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Get all dossier embeddings
    const allEmbeddings = await this.getAllEmbeddings();

    // Calculate similarities
    const results = allEmbeddings
      .map((dossierEmb) => ({
        dossierId: dossierEmb.dossierId,
        similarity: this.cosineSimilarity(queryEmbedding, dossierEmb.embedding),
        text: dossierEmb.text,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  /**
   * Delete embedding for a dossier
   */
  async deleteEmbedding(dossierId: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(dossierId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all embeddings
   */
  async clearAllEmbeddings(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.model !== null;
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService();
