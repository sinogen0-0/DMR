import type { Entity, MergeRecord } from '$lib/types';
import type { AnyDossier } from '$lib/types/dossier';
import { createDossierService } from '$lib/services/dossierService';
import { similarityScore } from '$lib/utils/similarity';

const AUTO_MERGE_THRESHOLD = 90;
const MANUAL_REVIEW_MIN = 55;
const HISTORY_KEY = 'dmr_merge_history';

export interface MergeCandidate {
  dossier: AnyDossier;
  similarity: number;
}

export interface MergeConflict {
  id: string;
  recordingId: string;
  entity: Entity;
  candidates: MergeCandidate[];
}

export interface MergeDecision {
  mode: 'created' | 'auto-merged' | 'manual-review';
  dossier?: AnyDossier;
  conflict?: MergeConflict;
  similarity?: number;
}

export interface MergeBatchResult {
  dossiers: AnyDossier[];
  conflicts: MergeConflict[];
  summary: {
    created: number;
    autoMerged: number;
    manualReview: number;
  };
}

export interface MergeResolutionResult {
  mode: 'merged' | 'created' | 'ignored';
  dossier?: AnyDossier;
}

function nowId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function dedupeMentions(existing: AnyDossier['mentions'], incoming: AnyDossier['mentions']): AnyDossier['mentions'] {
  const merged = [...existing];
  for (const mention of incoming) {
    if (!merged.some((m) => m.recordingId === mention.recordingId && m.context === mention.context)) {
      merged.push(mention);
    }
  }
  return merged;
}

export class MergeService {
  private dossierService = createDossierService();

  async initialize(): Promise<void> {
    await this.dossierService.initialize();
  }

  async checkAndMergeEntity(entity: Entity, recordingId: string): Promise<MergeDecision> {
    await this.initialize();

    const typedDossiers = await this.dossierService.listDossiers({ type: entity.type, limit: 500 });
    const candidates: MergeCandidate[] = typedDossiers
      .map((dossier) => ({ dossier, similarity: similarityScore(entity.name, dossier.name) }))
      .sort((a, b) => b.similarity - a.similarity);

    const best = candidates[0];
    if (!best || best.similarity < MANUAL_REVIEW_MIN) {
      const created = await this.dossierService.upsertFromEntity(entity, recordingId);
      return { mode: 'created', dossier: created, similarity: 0 };
    }

    if (best.similarity >= AUTO_MERGE_THRESHOLD) {
      const merged = await this.mergeEntityIntoDossier(best.dossier, entity, recordingId, best.similarity);
      return { mode: 'auto-merged', dossier: merged, similarity: best.similarity };
    }

    return {
      mode: 'manual-review',
      similarity: best.similarity,
      conflict: {
        id: nowId('merge_conflict'),
        recordingId,
        entity,
        candidates: candidates.slice(0, 3)
      }
    };
  }

  async processEntities(entities: Entity[], recordingId: string): Promise<MergeBatchResult> {
    const dossiers: AnyDossier[] = [];
    const conflicts: MergeConflict[] = [];

    const summary = {
      created: 0,
      autoMerged: 0,
      manualReview: 0
    };

    for (const entity of entities) {
      const decision = await this.checkAndMergeEntity(entity, recordingId);
      if (decision.mode === 'manual-review' && decision.conflict) {
        conflicts.push(decision.conflict);
        summary.manualReview += 1;
      } else if (decision.mode === 'auto-merged' && decision.dossier) {
        dossiers.push(decision.dossier);
        summary.autoMerged += 1;
      } else if (decision.mode === 'created' && decision.dossier) {
        dossiers.push(decision.dossier);
        summary.created += 1;
      }
    }

    return { dossiers, conflicts, summary };
  }

  async resolveConflict(
    conflict: MergeConflict,
    resolution: 'merge' | 'create_new' | 'ignore',
    candidateId?: string
  ): Promise<MergeResolutionResult> {
    await this.initialize();

    if (resolution === 'ignore') {
      return { mode: 'ignored' };
    }

    if (resolution === 'create_new') {
      const created = await this.dossierService.upsertFromEntity(conflict.entity, conflict.recordingId);
      return { mode: 'created', dossier: created };
    }

    const candidate = conflict.candidates.find((c) => c.dossier.id === candidateId) ?? conflict.candidates[0];
    if (!candidate) {
      const created = await this.dossierService.upsertFromEntity(conflict.entity, conflict.recordingId);
      return { mode: 'created', dossier: created };
    }

    const merged = await this.mergeEntityIntoDossier(
      candidate.dossier,
      conflict.entity,
      conflict.recordingId,
      candidate.similarity
    );

    return { mode: 'merged', dossier: merged };
  }

  listMergeHistory(): MergeRecord[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as MergeRecord[];
    } catch {
      return [];
    }
  }

  private recordMerge(entry: MergeRecord): void {
    if (typeof localStorage === 'undefined') return;
    const previous = this.listMergeHistory();
    const next = [entry, ...previous].slice(0, 1000);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  private async mergeEntityIntoDossier(
    target: AnyDossier,
    entity: Entity,
    recordingId: string,
    similarity: number
  ): Promise<AnyDossier> {
    const newMentions = (entity.mentions ?? []).map((context) => ({
      recordingId,
      timestamp: Date.now(),
      context
    }));

    const updated = await this.dossierService.updateDossier(target.id, {
      description: target.description || entity.description || '',
      mentions: dedupeMentions(target.mentions, newMentions)
    });

    this.recordMerge({
      id: nowId('merge'),
      sourceDossierId: target.id,
      targetDossierId: target.id,
      mergedAt: Date.now(),
      fieldsKept: ['name', 'type', 'relationships'],
      fieldsDiscarded: similarity >= AUTO_MERGE_THRESHOLD ? [] : ['name']
    });

    return updated;
  }
}

let mergeServiceInstance: MergeService | null = null;

export function createMergeService(): MergeService {
  if (!mergeServiceInstance) {
    mergeServiceInstance = new MergeService();
  }
  return mergeServiceInstance;
}
