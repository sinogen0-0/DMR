import type { DossierType, Entity } from '$types';
import {
  ambiguousConfidenceThreshold,
  categorizationRules,
  dndIndicatorKeywords,
  lowEvidenceThreshold
} from '$lib/data/categorizationRules';

export interface CategorizationResult {
  type: DossierType;
  confidence: number;
  scores: Record<DossierType, number>;
  reason: string;
}

export class CategorizationService {
  categorizeEntity(entity: string | Pick<Entity, 'name'>, context = ''): CategorizationResult {
    const entityName = typeof entity === 'string' ? entity : entity.name;
    const lowerName = entityName.toLowerCase();
    const lowerContext = context.toLowerCase();

    const scores: Record<DossierType, number> = {
      NPC: 5,
      PLAYER_CHARACTER: 0,
      LOCATION: 0,
      STORY_PLOT: 0
    };

    for (const rule of categorizationRules) {
      const target = rule.type;

      if (rule.nameStartsWith?.some(prefix => lowerName.startsWith(prefix))) {
        scores[target] += rule.scoreWeights.nameStartsWith;
      }

      if (rule.nameContains?.some(part => lowerName.includes(part.trim()))) {
        scores[target] += rule.scoreWeights.nameContains;
      }

      if (rule.nameEndsWith?.some(suffix => lowerName.endsWith(suffix))) {
        scores[target] += rule.scoreWeights.nameEndsWith;
      }

      if (rule.contextKeywords) {
        for (const keyword of rule.contextKeywords) {
          if (lowerContext.includes(keyword)) {
            scores[target] += rule.scoreWeights.contextKeyword;
          }
        }
      }

      if (rule.contextPhrases) {
        for (const phrase of rule.contextPhrases) {
          if (lowerContext.includes(phrase)) {
            scores[target] += rule.scoreWeights.contextPhrase;
          }
        }
      }
    }

    if (
      dndIndicatorKeywords.raceTerms.some(term => lowerContext.includes(term)) ||
      dndIndicatorKeywords.classTerms.some(term => lowerContext.includes(term))
    ) {
      scores.NPC += 10;
      scores.PLAYER_CHARACTER += 8;
    }

    if (
      dndIndicatorKeywords.locationPrepositions.some(prep =>
        lowerContext.includes(`${prep} ${lowerName}`)
      )
    ) {
      scores.LOCATION += 14;
    }

    const ranked = (Object.entries(scores) as Array<[DossierType, number]>).sort((a, b) => b[1] - a[1]);
    const [bestType, bestScore] = ranked[0];
    const secondScore = ranked[1]?.[1] ?? 0;

    if (bestScore < lowEvidenceThreshold) {
      return {
        type: 'NPC',
        confidence: 25,
        scores,
        reason: 'Low evidence in context; using NPC fallback.'
      };
    }

    const scoreDelta = bestScore - secondScore;
    let confidence = Math.min(100, Math.round(bestScore * 1.8));

    if (scoreDelta < ambiguousConfidenceThreshold) {
      confidence = Math.max(35, confidence - 25);
    }

    return {
      type: bestType,
      confidence,
      scores,
      reason:
        scoreDelta < ambiguousConfidenceThreshold
          ? `Ambiguous result; ${bestType} selected by small margin (${scoreDelta}).`
          : `${bestType} selected by strongest rule match.`
    };
  }

  categorizeEntities(entities: Entity[], fullText?: string): Entity[] {
    return entities.map((entity) => {
      const localContext = entity.mentions?.[0] ?? fullText ?? '';
      const { type, confidence } = this.categorizeEntity(entity, localContext);

      return {
        ...entity,
        type,
        confidence
      };
    });
  }
}

let categorizationServiceInstance: CategorizationService | null = null;

export function createCategorizationService(): CategorizationService {
  if (!categorizationServiceInstance) {
    categorizationServiceInstance = new CategorizationService();
  }

  return categorizationServiceInstance;
}
