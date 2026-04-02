/**
 * Entity Extraction Service
 * Uses Compromise.js for NER + D&D-specific rules for classification
 */

import type { Entity, DossierType, TranscriptionTag } from '$types';
import { createCustomEntityService } from '$lib/services/customEntityService';
import { createCategorizationService } from '$lib/services/categorization/categorizationService';

export interface ExtractionOptions {
  minConfidence?: number;
  maxEntities?: number;
  language?: string;
}

export class ExtractionService {
  private nlpInstance: any = null;
  private ready = false;
  private categorizationService = createCategorizationService();
  private customEntityService = createCustomEntityService();
  private customEntityLookup = new Map<string, { id: string; type: DossierType }>();
  private customEntityNames: Record<DossierType, string[]> = {
    PLAYER_CHARACTER: [],
    NPC: [],
    LOCATION: [],
    STORY_PLOT: []
  };

  /**
   * Initialize Compromise.js (lazy load on first use)
   */
  async initialize(): Promise<void> {
    if (this.ready) return;

    try {
      // Dynamically import compromise
      const nlpModule = await import('compromise');
      this.nlpInstance = nlpModule.default || nlpModule;

      // Load user-managed entity names
      await this.refreshCustomEntities();

      this.ready = true;
      console.log('Compromise.js initialized for entity extraction');
    } catch (e) {
      console.error('Failed to initialize Compromise.js:', e);
      throw new Error('Entity extraction not available - Compromise.js failed to load');
    }
  }

  /**
   * Reload custom entity names from IndexedDB
   */
  async refreshCustomEntities(): Promise<void> {
    try {
      await this.customEntityService.initialize();
      this.customEntityNames = await this.customEntityService.getEntityNamesByType();

      const allCustom = await this.customEntityService.listEntities();
      this.customEntityLookup.clear();
      for (const entity of allCustom) {
        this.customEntityLookup.set(entity.name.trim().toLowerCase(), {
          id: entity.id,
          type: entity.type
        });
      }
    } catch (e) {
      console.warn('Could not load custom entity lists:', e);
    }
  }

  /**
   * Build dossier tags from transcription text.
   */
  async buildTranscriptionTags(text: string, options: ExtractionOptions = {}): Promise<TranscriptionTag[]> {
    await this.refreshCustomEntities();
    const extracted = await this.extractEntities(text, options);

    return extracted
      .map((entity): TranscriptionTag => {
        const link = this.resolveCustomEntityLink(entity.name, entity.type);
        return {
          id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name: entity.name,
          type: link?.type ?? entity.type,
          confidence: entity.confidence,
          source: entity.source ?? 'transcription',
          mentionContexts: entity.mentions,
          status: link ? 'linked' : 'needs_review',
          customEntityId: link?.id
        };
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  private resolveCustomEntityLink(name: string, inferredType: DossierType): { id: string; type: DossierType } | undefined {
    const normalized = name.trim().toLowerCase();
    const direct = this.customEntityLookup.get(normalized);
    if (direct) {
      return direct;
    }

    // Prefer same-type fuzzy matches when exact match is missing.
    const candidates = this.customEntityNames[inferredType] || [];
    const candidate = candidates.find((item) => item.trim().toLowerCase() === normalized);
    if (!candidate) {
      return undefined;
    }

    return this.customEntityLookup.get(candidate.trim().toLowerCase());
  }

  /**
   * Extract entities from transcription text using Compromise.js + D&D rules
   */
  async extractEntities(text: string, options: ExtractionOptions = {}): Promise<Entity[]> {
    if (!this.ready) {
      await this.initialize();
    }

    const { minConfidence = 30, maxEntities = 50, language = 'en' } = options;

    try {
      // Process text with Compromise.js
      const doc = this.nlpInstance(text, language);
      const entities: Entity[] = [];
      const seenNames = new Set<string>();

      // Extract candidates from multiple NER sources
      let allCandidates: string[] = [];

      try {
        // Try to get proper nouns
        const properNouns = doc.nouns().isProper().out('array');
        allCandidates = [...allCandidates, ...properNouns];
      } catch (e) {
        console.warn('Failed to extract proper nouns:', e);
      }

      try {
        // Try to get people names
        const people = doc.people().out('array');
        allCandidates = [...allCandidates, ...people];
      } catch (e) {
        console.warn('Failed to extract people:', e);
      }

      try {
        // Try to get organizations
        const orgs = doc.organizations().out('array');
        allCandidates = [...allCandidates, ...orgs];
      } catch (e) {
        console.warn('Failed to extract organizations:', e);
      }

      // Add phrasal entity extraction
      allCandidates = [...allCandidates, ...this._extractPhrasalEntities(text)];
      allCandidates = allCandidates.map((candidate) => this._sanitizeEntityName(candidate)).filter(Boolean) as string[];

      // Match user-added custom entity names directly in the text
      for (const [type, names] of Object.entries(this.customEntityNames)) {
        for (const name of names) {
          const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
          if (regex.test(text)) {
            // Direct match from user list — add as high-confidence candidate
            if (!seenNames.has(name)) {
              seenNames.add(name);
              entities.push({
                id: this._generateId(),
                name,
                type: type as DossierType,
                confidence: 95,
                mentions: this._findMentions(text, name),
                source: 'custom_list'
              });
            }
          }
        }
      }

      // Remove duplicates and process candidates
      const uniqueCandidates = Array.from(new Set(allCandidates));

      for (const candidate of uniqueCandidates) {
        if (seenNames.has(candidate)) continue;
        if (entities.length >= maxEntities) break;

        seenNames.add(candidate);

        // Get context around entity (100 char window)
        const index = text.toLowerCase().indexOf(candidate.toLowerCase());
        if (index === -1) continue;

        const start = Math.max(0, index - 100);
        const end = Math.min(text.length, index + candidate.length + 100);
        const context = text.substring(start, end);

        // Classify entity type using dedicated categorization service rules
        const { type, confidence } = this.categorizationService.categorizeEntity(candidate, context);

        // Only include entities meeting confidence threshold
        if (confidence >= minConfidence) {
          entities.push({
            id: this._generateId(),
            name: candidate,
            type,
            confidence: Math.round(confidence),
            mentions: this._findMentions(text, candidate),
            source: 'transcription'
          });
        }
      }

      // Sort by confidence descending
      return entities.sort((a, b) => b.confidence - a.confidence);
    } catch (e) {
      console.error('Entity extraction failed:', e);
      throw new Error(`Entity extraction failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract multi-word entities using fantasy naming patterns
   */
  private _extractPhrasalEntities(text: string): string[] {
    const phrases: string[] = [];

    // Common D&D patterns: "[Title] [Name]", "[Place] of [Place]", "The [Place]"
    const patterns = [
      /\b(?:Lord|Lady|King|Queen|Sir|Dame|Master|Captain|General)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,
      /\b[A-Z][a-z]+\s+(?:of|the|The)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,
      /\b(?:[A-Z][a-z]+\s+)?(?:Shield|Sword|Amulet|Crown|Ring|Orb|Book|Tome|Stone|Key)\s+of\s+the\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,
      /\bThe\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:shire|dale|ford|burg|wood|forest|grove|glen|vale|peak|mountain|hill|isle|island|keep|castle|tower|fortress|dungeon|tavern|inn)\b/gi
    ];

    patterns.forEach(pattern => {
      let match;
      // Reset regex lastIndex for global flag
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        phrases.push(match[0]);
      }
    });

    return phrases;
  }

  /**
   * Normalize extracted candidate entities.
   */
  private _sanitizeEntityName(entity: string): string {
    return entity
      .replace(/^\s+|\s+$/g, '')
      .replace(/[.,!?;:]+$/g, '')
      .replace(/\s{2,}/g, ' ');
  }

  /**
   * Find all mention contexts for an entity in the text
   */
  private _findMentions(text: string, entity: string): string[] {
    const mentions: string[] = [];

    // Escape special regex characters
    const escapedEntity = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedEntity}\\b`, 'gi');

    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + entity.length + 50);
      const mentionContext = text.substring(start, end).trim();

      if (!mentions.includes(mentionContext)) {
        mentions.push(mentionContext);
      }

      if (mentions.length >= 5) break; // Store up to 5 mention contexts
    }

    return mentions;
  }

  /**
   * Generate unique entity ID
   */
  private _generateId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

let extractionServiceInstance: ExtractionService | null = null;

/**
 * Factory function to create or return singleton extraction service
 */
export function createExtractionService(): ExtractionService {
  if (!extractionServiceInstance) {
    extractionServiceInstance = new ExtractionService();
  }
  return extractionServiceInstance;
}
