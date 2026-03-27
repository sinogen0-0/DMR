/**
 * Global Type Definitions
 */

export type DossierType = 'NPC' | 'PLAYER_CHARACTER' | 'LOCATION' | 'STORY_PLOT';

export interface Entity {
  id?: string;
  name: string;
  type: DossierType;
  confidence: number;
  mentions: string[];
  source?: string;
}

export interface Recording {
  id: string;
  timestamp: number;
  duration: number;
  format: 'flac' | 'm4a' | 'opus';
  size: number;
  blobUrl?: string;
  path?: string;
  transcription?: string;
  extractedEntities?: Entity[];
}

export interface Dossier {
  id: string;
  name: string;
  type: DossierType;
  description: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
  relationships: DossierRelationship[];
  mentions: DossierMention[];
  metadata?: Record<string, unknown>;
}

export interface DossierRelationship {
  targetDossierId: string;
  relationshipType: string;
  description?: string;
}

export interface DossierMention {
  recordingId: string;
  timestamp: number;
  context: string;
}

export interface MergeRecord {
  id: string;
  sourceDossierId: string;
  targetDossierId: string;
  mergedAt: number;
  fieldsKept: string[];
  fieldsDiscarded: string[];
}

export interface AppSettings {
  audioCodec: 'flac' | 'opus';
  mergeThreshold: number;
  referenceLinkStyle: 'modal' | 'fullpage';
  language: string;
  theme: 'light' | 'dark';
}
