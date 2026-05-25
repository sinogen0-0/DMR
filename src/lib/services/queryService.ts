/**
 * Query Service
 * Parses user questions and extracts intent, entities, and keywords
 */

import nlp from 'compromise';
import type { DossierType } from '../types/dossier';

export interface QueryIntent {
  type: 'who' | 'what' | 'where' | 'when' | 'why' | 'how' | 'general';
  dossierType: DossierType | null;
  entities: string[];
  keywords: string[];
  originalQuestion: string;
}

class QueryService {
  /**
   * Parse a question and extract intent and entities
   */
  parseQuestion(question: string): QueryIntent {
    const doc = nlp(question);
    const lowerQuestion = question.toLowerCase();

    // Determine question type
    let type: QueryIntent['type'] = 'general';
    if (lowerQuestion.startsWith('who ')) type = 'who';
    else if (lowerQuestion.startsWith('what ')) type = 'what';
    else if (lowerQuestion.startsWith('where ')) type = 'where';
    else if (lowerQuestion.startsWith('when ')) type = 'when';
    else if (lowerQuestion.startsWith('why ')) type = 'why';
    else if (lowerQuestion.startsWith('how ')) type = 'how';

    // Determine dossier type from question
    let dossierType: DossierType | null = null;

    // Check for character-related keywords
    if (
      /\b(character|player|pc|hero|protagonist)\b/i.test(question) ||
      /\b(class|race|level)\b/i.test(question)
    ) {
      dossierType = 'PLAYER_CHARACTER';
    }
    // Check for NPC-related keywords
    else if (
      /\b(npc|villain|enemy|merchant|guard|ally|companion|lord|knight|king|queen)\b/i.test(
        question
      ) ||
      /\b(faction|status|hostile|ally)\b/i.test(question)
    ) {
      dossierType = 'NPC';
    }
    // Check for location-related keywords
    else if (
      /\b(location|place|city|town|village|dungeon|castle|keep|tavern|temple|forest|mountain)\b/i.test(
        question
      ) ||
      /\b(where|located)\b/i.test(question)
    ) {
      dossierType = 'LOCATION';
    }
    // Check for story-related keywords
    else if (
      /\b(plot|story|quest|mission|event|happening|happened|occur)\b/i.test(question)
    ) {
      dossierType = 'STORY_PLOT';
    }

    // Extract entities (people, places, proper nouns)
    const entities: string[] = [];

    // Extract people
    const people = doc.people().out('array');
    entities.push(...people);

    // Extract places
    const places = doc.places().out('array');
    entities.push(...places);

    // Extract proper nouns (capitalize words that might be names)
    const properNouns = doc
      .match('#ProperNoun+')
      .out('array')
      .filter((noun) => noun.length > 2); // Filter out short words
    entities.push(...properNouns);

    // Extract keywords (nouns and verbs, excluding common words)
    const nouns = doc.nouns().out('array');
    const verbs = doc.verbs().out('array');

    const stopWords = [
      'who',
      'what',
      'where',
      'when',
      'why',
      'how',
      'is',
      'are',
      'was',
      'were',
      'the',
      'a',
      'an',
      'of',
      'in',
      'on',
      'at',
      'to',
      'for',
      'with',
      'by',
      'about',
    ];

    const keywords = [...nouns, ...verbs]
      .map((word) => word.toLowerCase())
      .filter((word) => !stopWords.includes(word) && word.length > 2)
      .filter((word, index, self) => self.indexOf(word) === index); // Unique

    // Remove duplicates from entities
    const uniqueEntities = Array.from(new Set(entities)).filter(
      (entity) => entity.length > 1
    );

    return {
      type,
      dossierType,
      entities: uniqueEntities,
      keywords,
      originalQuestion: question,
    };
  }

  /**
   * Generate search keywords from query intent
   */
  generateSearchKeywords(intent: QueryIntent): string[] {
    return [...intent.entities, ...intent.keywords].filter(Boolean);
  }

  /**
   * Determine if question is about relationships
   */
  isRelationshipQuery(question: string): boolean {
    return /\b(related|relationship|connected|know|ally|enemy|friend|foe)\b/i.test(question);
  }

  /**
   * Determine if question is about recent events
   */
  isRecentQuery(question: string): boolean {
    return /\b(recent|latest|last|new|happened|occur)\b/i.test(question);
  }

  /**
   * Extract mentioned names from question (for filtering)
   */
  extractMentionedNames(question: string): string[] {
    const doc = nlp(question);

    const names = [
      ...doc.people().out('array'),
      ...doc.places().out('array'),
      ...doc.match('#ProperNoun+').out('array'),
    ];

    return Array.from(new Set(names)).filter((name) => name.length > 2);
  }
}

// Singleton instance
export const queryService = new QueryService();
