import { get, writable } from 'svelte/store';
import type { DossierType } from '$types';

export interface RuleWeights {
  nameStartsWith: number;
  nameContains: number;
  nameEndsWith: number;
  contextKeyword: number;
  contextPhrase: number;
}

export interface RuleConfig {
  type: DossierType;
  nameStartsWith: string[];
  nameContains: string[];
  nameEndsWith: string[];
  contextKeywords: string[];
  contextPhrases: string[];
  weights: RuleWeights;
}

export interface ExtractionDefaults {
  minConfidence: number;
  maxEntities: number;
}

export interface CategorizationThresholds {
  ambiguous: number;
  lowEvidence: number;
}

export interface IndicatorConfig {
  raceTerms: string[];
  classTerms: string[];
  locationPrepositions: string[];
  raceClassNpcBonus: number;
  raceClassPcBonus: number;
  locationPrepBonus: number;
}

export interface TaggingParams {
  extraction: ExtractionDefaults;
  thresholds: CategorizationThresholds;
  rules: RuleConfig[];
  indicators: IndicatorConfig;
}

const STORAGE_KEY = 'dmr_tagging_params';

export const DEFAULT_TAGGING_PARAMS: TaggingParams = {
  extraction: { minConfidence: 30, maxEntities: 50 },
  thresholds: { ambiguous: 8, lowEvidence: 20 },
  rules: [
    {
      type: 'NPC',
      nameStartsWith: ['lord ', 'lady ', 'sir ', 'dame ', 'captain ', 'commander ', 'master ', 'elder ', 'high priest '],
      nameContains: [' the guard', ' the merchant', ' the innkeeper', ' the wizard', ' the priest', ' of the watch'],
      nameEndsWith: [],
      contextKeywords: ['npc', 'non player', 'villager', 'merchant', 'guard', 'quest giver', 'talked to', 'met', 'spoke with'],
      contextPhrases: ['he said', 'she said', 'they offered', 'gave us a quest', 'asked for help'],
      weights: { nameStartsWith: 28, nameContains: 18, nameEndsWith: 0, contextKeyword: 10, contextPhrase: 16 }
    },
    {
      type: 'PLAYER_CHARACTER',
      nameStartsWith: [],
      nameContains: [' of the party', ' our ', ' my character '],
      nameEndsWith: [],
      contextKeywords: ['player', 'pc', 'our party', 'my character', 'my build', 'level up', 'spell slots', 'initiative'],
      contextPhrases: ['our rogue', 'our cleric', 'our wizard', 'my barbarian', 'my ranger', 'our character'],
      weights: { nameStartsWith: 0, nameContains: 15, nameEndsWith: 0, contextKeyword: 12, contextPhrase: 18 }
    },
    {
      type: 'LOCATION',
      nameStartsWith: ['the ', 'mount ', 'fort ', 'castle ', 'temple ', 'ruins of '],
      nameContains: [],
      nameEndsWith: ['shire', 'dale', 'ford', 'burg', 'port', 'haven', 'wood', 'forest', 'grove', 'glen', 'vale', 'peak', 'mountain', 'hill', 'keep', 'castle', 'tower', 'dungeon'],
      contextKeywords: ['location', 'town', 'city', 'village', 'forest', 'dungeon', 'travelled', 'arrived', 'headed to', 'from'],
      contextPhrases: ['in the', 'at the', 'inside the', 'outside the', 'north of', 'south of', 'east of', 'west of'],
      weights: { nameStartsWith: 14, nameContains: 0, nameEndsWith: 30, contextKeyword: 9, contextPhrase: 10 }
    },
    {
      type: 'STORY_PLOT',
      nameStartsWith: [],
      nameContains: [],
      nameEndsWith: [],
      contextKeywords: ['quest', 'objective', 'mission', 'plot', 'scheme', 'prophecy', 'betrayal', 'defeat', 'rescue', 'discover', 'investigate', 'artifact', 'ritual', 'conspiracy'],
      contextPhrases: ['the goal is', 'we need to', 'next session', 'story beat', 'main objective', 'side quest'],
      weights: { nameStartsWith: 0, nameContains: 0, nameEndsWith: 0, contextKeyword: 11, contextPhrase: 16 }
    }
  ],
  indicators: {
    raceTerms: ['human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'tiefling', 'orc', 'goblin', 'drow'],
    classTerms: ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'],
    locationPrepositions: ['in', 'at', 'from', 'to', 'near', 'inside', 'outside', 'toward', 'towards'],
    raceClassNpcBonus: 10,
    raceClassPcBonus: 8,
    locationPrepBonus: 14
  }
};

function loadFromStorage(): TaggingParams {
  if (typeof localStorage === 'undefined') return DEFAULT_TAGGING_PARAMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TAGGING_PARAMS;
    const parsed = JSON.parse(raw) as TaggingParams;
    return {
      ...DEFAULT_TAGGING_PARAMS,
      ...parsed,
      extraction: { ...DEFAULT_TAGGING_PARAMS.extraction, ...parsed.extraction },
      thresholds: { ...DEFAULT_TAGGING_PARAMS.thresholds, ...parsed.thresholds },
      indicators: { ...DEFAULT_TAGGING_PARAMS.indicators, ...parsed.indicators }
    };
  } catch {
    return DEFAULT_TAGGING_PARAMS;
  }
}

function saveToStorage(params: TaggingParams): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // ignore storage errors
  }
}

export const taggingParams = writable<TaggingParams>(loadFromStorage());

taggingParams.subscribe(saveToStorage);

export function getTaggingParams(): TaggingParams {
  return get(taggingParams);
}

export function resetTaggingParams(): void {
  taggingParams.set(JSON.parse(JSON.stringify(DEFAULT_TAGGING_PARAMS)));
}
