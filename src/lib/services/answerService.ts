/**
 * Answer Service
 * Generates answers to questions using RAG (Retrieval-Augmented Generation)
 * Currently uses template-based generation; can be enhanced with local LLM
 */

import { embeddingService } from './embeddingService';
import { queryService, type QueryIntent } from './queryService';
import { dossierService } from './dossierService';
import type { AnyDossier } from '../types/dossier';

export interface AnswerResult {
  answer: string;
  sources: AnyDossier[];
  confidence: number;
  method: 'semantic' | 'keyword' | 'not_found';
}

class AnswerService {
  /**
   * Answer a question using RAG pipeline
   */
  async answerQuestion(question: string): Promise<AnswerResult> {
    // Parse the question
    const intent = queryService.parseQuestion(question);

    // Try semantic search first (if model is loaded)
    if (embeddingService.isModelLoaded()) {
      const semanticResults = await embeddingService.semanticSearch(question, 5);

      if (semanticResults.length > 0 && semanticResults[0].similarity > 0.3) {
        // Fetch the actual dossiers
        const dossierPromises = semanticResults.map((result) =>
          dossierService.readDossier(result.dossierId)
        );
        const dossiers = (await Promise.all(dossierPromises)).filter(
          (d): d is AnyDossier => d !== null
        );

        if (dossiers.length > 0) {
          const answer = this.generateAnswer(intent, dossiers, 'semantic');
          const confidence = semanticResults[0].similarity;

          return {
            answer,
            sources: dossiers,
            confidence,
            method: 'semantic',
          };
        }
      }
    }

    // Fallback to keyword search
    const keywordResults = await this.keywordSearch(intent);

    if (keywordResults.length > 0) {
      const answer = this.generateAnswer(intent, keywordResults, 'keyword');

      return {
        answer,
        sources: keywordResults,
        confidence: 0.7,
        method: 'keyword',
      };
    }

    // No results found
    return {
      answer: this.generateNoResultsAnswer(intent),
      sources: [],
      confidence: 0,
      method: 'not_found',
    };
  }

  /**
   * Keyword-based search fallback
   */
  private async keywordSearch(intent: QueryIntent): Promise<AnyDossier[]> {
    const searchTerms = queryService.generateSearchKeywords(intent);
    const searchQuery = searchTerms.join(' ');

    const results = await dossierService.listDossiers({
      search: searchQuery,
      type: intent.dossierType || undefined,
      limit: 5,
    });

    return results;
  }

  /**
   * Generate natural language answer from retrieved dossiers
   */
  private generateAnswer(
    intent: QueryIntent,
    dossiers: AnyDossier[],
    method: 'semantic' | 'keyword'
  ): string {
    const topDossier = dossiers[0];

    // Generate answer based on question type
    switch (intent.type) {
      case 'who':
        return this.generateWhoAnswer(topDossier, dossiers);

      case 'what':
        return this.generateWhatAnswer(topDossier, dossiers);

      case 'where':
        return this.generateWhereAnswer(topDossier, dossiers);

      case 'when':
        return this.generateWhenAnswer(topDossier, dossiers);

      case 'why':
      case 'how':
        return this.generateExplanationAnswer(topDossier, dossiers);

      default:
        return this.generateGeneralAnswer(topDossier, dossiers);
    }
  }

  /**
   * Generate "who" answer
   */
  private generateWhoAnswer(top: AnyDossier, all: AnyDossier[]): string {
    let answer = `${top.name} is `;

    if (top.type === 'NPC') {
      const status = (top as any).status || 'UNKNOWN';
      const faction = (top as any).faction;
      answer += `an NPC with status: ${status}`;
      if (faction) answer += ` affiliated with ${faction}`;
    } else if (top.type === 'PLAYER_CHARACTER') {
      const playerName = (top as any).playerName;
      const charClass = (top as any).class;
      const race = (top as any).race;
      answer += `a player character`;
      if (playerName) answer += ` played by ${playerName}`;
      if (charClass && race) answer += ` (${race} ${charClass})`;
    } else if (top.type === 'LOCATION') {
      answer += `a location`;
    } else {
      answer += `a ${top.type.toLowerCase().replace('_', ' ')}`;
    }

    answer += `. ${top.description || ''}`;

    if (all.length > 1) {
      const others = all.slice(1, 3).map((d) => d.name);
      answer += `\n\nRelated: ${others.join(', ')}`;
    }

    return answer.trim();
  }

  /**
   * Generate "what" answer
   */
  private generateWhatAnswer(top: AnyDossier, all: AnyDossier[]): string {
    let answer = top.description || `${top.name} is mentioned in the records.`;

    if (top.type === 'STORY_PLOT') {
      answer = `${top.name}: ${answer}`;
    }

    if (all.length > 1) {
      answer += `\n\nAdditional information found in: ${all
        .slice(1, 3)
        .map((d) => d.name)
        .join(', ')}`;
    }

    return answer.trim();
  }

  /**
   * Generate "where" answer
   */
  private generateWhereAnswer(top: AnyDossier, all: AnyDossier[]): string {
    let answer = '';

    if (top.type === 'LOCATION') {
      answer = `${top.name} is a location. ${top.description || ''}`;
    } else if (top.type === 'NPC' && (top as any).location) {
      answer = `${top.name} is located at ${(top as any).location}.`;
    } else {
      answer = `${top.name} is mentioned in connection with locations. ${
        top.description || ''
      }`;
    }

    // Check for location mentions in other dossiers
    const locations = all.filter((d) => d.type === 'LOCATION');
    if (locations.length > 0) {
      answer += `\n\nRelated locations: ${locations.map((l) => l.name).join(', ')}`;
    }

    return answer.trim();
  }

  /**
   * Generate "when" answer
   */
  private generateWhenAnswer(top: AnyDossier, all: AnyDossier[]): string {
    const updatedDate = new Date(top.updatedAt).toLocaleDateString();

    let answer = `${top.name} was last recorded on ${updatedDate}. `;
    answer += top.description || 'No additional temporal information available.';

    return answer.trim();
  }

  /**
   * Generate explanation answer
   */
  private generateExplanationAnswer(top: AnyDossier, all: AnyDossier[]): string {
    let answer = `Regarding ${top.name}: ${top.description || 'No detailed explanation available.'}`;

    if ((top as any).notes) {
      answer += `\n\nNotes: ${(top as any).notes}`;
    }

    return answer.trim();
  }

  /**
   * Generate general answer
   */
  private generateGeneralAnswer(top: AnyDossier, all: AnyDossier[]): string {
    let answer = `**${top.name}**\n\n`;
    answer += top.description || 'No description available.';

    if (all.length > 1) {
      answer += `\n\n**Related:**\n`;
      all.slice(1, 4).forEach((d) => {
        answer += `• ${d.name}`;
        if (d.description) {
          const shortDesc = d.description.substring(0, 80);
          answer += `: ${shortDesc}${d.description.length > 80 ? '...' : ''}`;
        }
        answer += '\n';
      });
    }

    return answer.trim();
  }

  /**
   * Generate no results answer
   */
  private generateNoResultsAnswer(intent: QueryIntent): string {
    const suggestions = [
      'Try rephrasing your question',
      'Make sure names are spelled correctly',
      'Check if the information has been recorded',
    ];

    return `No records found for "${intent.originalQuestion}".\n\n${suggestions.join('\n• ')}`;
  }

  /**
   * Initialize the answer service (preload models)
   */
  async initialize(): Promise<void> {
    try {
      await embeddingService.initialize();
      console.log('[AnswerService] Initialized successfully');
    } catch (error) {
      console.error('[AnswerService] Initialization error:', error);
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return embeddingService.isModelLoaded();
  }
}

// Singleton instance
export const answerService = new AnswerService();
