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

// Future service exports:
// export { createTranscriptionService } from './transcriptionService';
// export { createExtractionService } from './extractionService';
// export { createCategorizationService } from './categorizationService';
