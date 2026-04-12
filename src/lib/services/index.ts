/**
 * Central export point for all services
 * This allows clean imports: import { createAudioService } from '$services'
 */

export { createAudioService } from './audioService';
export { createStorageService, resetStorageService } from './storageService';
export type { StorageService } from './storageService';
export { createTranscriptionService } from './transcriptionService';
export type { TranscriptionService, TranscriptionResult, TranscriptionSession } from './transcriptionService';
export { createMicrophonePermission, MicrophonePermission } from '$lib/features/audio/services/permissions/microphonePermission';
export type { PermissionStatus, PermissionCheckResult, PermissionRequestResult } from '$lib/features/audio/services/permissions/microphonePermission';
export type { Recording } from '$lib/types';

export { createExtractionService } from './extraction/extractionService';
export type { ExtractionService, ExtractionOptions } from './extraction/extractionService';
export { createCustomEntityService } from './customEntityService';
export { createCategorizationService } from './categorization/categorizationService';
export type { CategorizationService, CategorizationResult } from './categorization/categorizationService';
export { createDossierService } from './dossierService';
export type { DossierService } from './dossierService';
export { createMergeService } from './mergeService';
export type { MergeService, MergeConflict, MergeBatchResult, MergeResolutionResult } from './mergeService';
