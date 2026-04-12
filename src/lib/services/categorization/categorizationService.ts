import type { DossierType, Entity } from '$types';
import { getTaggingParams } from '$stores/taggingParamsStore';

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
    const { rules, thresholds, indicators } = getTaggingParams();

    const scores: Record<DossierType, number> = {
      NPC: 5,
      PLAYER_CHARACTER: 0,
      LOCATION: 0,
      STORY_PLOT: 0
    };

    for (const rule of rules) {
      const target = rule.type;

      if (rule.nameStartsWith?.some(prefix => lowerName.startsWith(prefix))) {
        scores[target] += rule.weights.nameStartsWith;
      }

      if (rule.nameContains?.some(part => lowerName.includes(part))) {
        scores[target] += rule.weights.nameContains;
      }

      if (rule.nameEndsWith?.some(suffix => lowerName.endsWith(suffix))) {
        scores[target] += rule.weights.nameEndsWith;
      }

      for (const keyword of (rule.contextKeywords ?? [])) {
        if (lowerContext.includes(keyword)) {
          scores[target] += rule.weights.contextKeyword;
        }
      }

      for (const phrase of (rule.contextPhrases ?? [])) {
        if (lowerContext.includes(phrase)) {
          scores[target] += rule.weights.contextPhrase;
        }
      }
    }

    if (
      indicators.raceTerms.some(term => lowerContext.includes(term)) ||
      indicators.classTerms.some(term => lowerContext.includes(term))
    ) {
      scores.NPC += indicators.raceClassNpcBonus;
      scores.PLAYER_CHARACTER += indicators.raceClassPcBonus;
    }

    if (
      indicators.locationPrepositions.some(prep =>
        lowerContext.includes(`${prep} ${lowerName}`)
      )
    ) {
      scores.LOCATION += indicators.locationPrepBonus;
    }

    const ranked = (Object.entries(scores) as Array<[DossierType, number]>).sort((a, b) => b[1] - a[1]);
    const [bestType, bestScore] = ranked[0];
    const secondScore = ranked[1]?.[1] ?? 0;

    if (bestScore < thresholds.lowEvidence) {
      return {
        type: 'NPC',
        confidence: 32,
        scores,
        reason: 'Low evidence in context; using NPC fallback.'
      };
    }

    const scoreDelta = bestScore - secondScore;
    let confidence = Math.min(100, Math.round(bestScore * 1.8));

    if (scoreDelta < thresholds.ambiguous) {
      confidence = Math.max(35, confidence - 25);
    }

    return {
      type: bestType,
      confidence,
      scores,
      reason:
        scoreDelta < thresholds.ambiguous
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
