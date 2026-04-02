import type { DossierType } from '$types';

export interface CategorizationRuleSet {
  type: DossierType;
  nameStartsWith?: string[];
  nameContains?: string[];
  nameEndsWith?: string[];
  contextKeywords?: string[];
  contextPhrases?: string[];
  scoreWeights: {
    nameStartsWith: number;
    nameContains: number;
    nameEndsWith: number;
    contextKeyword: number;
    contextPhrase: number;
  };
}

export const categorizationRules: CategorizationRuleSet[] = [
  {
    type: 'NPC',
    nameStartsWith: [
      'lord ', 'lady ', 'sir ', 'dame ', 'captain ', 'commander ', 'master ', 'elder ', 'high priest '
    ],
    nameContains: [
      ' the guard', ' the merchant', ' the innkeeper', ' the wizard', ' the priest', ' of the watch'
    ],
    contextKeywords: [
      'npc', 'non player', 'villager', 'merchant', 'guard', 'quest giver', 'talked to', 'met', 'spoke with'
    ],
    contextPhrases: [
      'he said', 'she said', 'they offered', 'gave us a quest', 'asked for help'
    ],
    scoreWeights: {
      nameStartsWith: 28,
      nameContains: 18,
      nameEndsWith: 0,
      contextKeyword: 10,
      contextPhrase: 16
    }
  },
  {
    type: 'PLAYER_CHARACTER',
    nameContains: [' of the party', ' our ', ' my character '],
    contextKeywords: [
      'player', 'pc', 'our party', 'my character', 'my build', 'level up', 'spell slots', 'initiative'
    ],
    contextPhrases: [
      'our rogue', 'our cleric', 'our wizard', 'my barbarian', 'my ranger', 'our character'
    ],
    scoreWeights: {
      nameStartsWith: 0,
      nameContains: 15,
      nameEndsWith: 0,
      contextKeyword: 12,
      contextPhrase: 18
    }
  },
  {
    type: 'LOCATION',
    nameStartsWith: ['the ', 'mount ', 'fort ', 'castle ', 'temple ', 'ruins of '],
    nameEndsWith: [
      'shire', 'dale', 'ford', 'burg', 'port', 'haven', 'wood', 'forest', 'grove',
      'glen', 'vale', 'peak', 'mountain', 'hill', 'keep', 'castle', 'tower', 'dungeon'
    ],
    contextKeywords: [
      'location', 'town', 'city', 'village', 'forest', 'dungeon', 'travelled', 'arrived', 'headed to', 'from'
    ],
    contextPhrases: [
      'in the', 'at the', 'inside the', 'outside the', 'north of', 'south of', 'east of', 'west of'
    ],
    scoreWeights: {
      nameStartsWith: 14,
      nameContains: 0,
      nameEndsWith: 30,
      contextKeyword: 9,
      contextPhrase: 10
    }
  },
  {
    type: 'STORY_PLOT',
    contextKeywords: [
      'quest', 'objective', 'mission', 'plot', 'scheme', 'prophecy', 'betrayal',
      'defeat', 'rescue', 'discover', 'investigate', 'artifact', 'ritual', 'conspiracy'
    ],
    contextPhrases: [
      'the goal is', 'we need to', 'next session', 'story beat', 'main objective', 'side quest'
    ],
    scoreWeights: {
      nameStartsWith: 0,
      nameContains: 0,
      nameEndsWith: 0,
      contextKeyword: 11,
      contextPhrase: 16
    }
  }
];

export const dndIndicatorKeywords = {
  raceTerms: [
    'human', 'elf', 'dwarf', 'halfling', 'dragonborn', 'gnome', 'tiefling', 'orc', 'goblin', 'drow'
  ],
  classTerms: [
    'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'
  ],
  locationPrepositions: ['in', 'at', 'from', 'to', 'near', 'inside', 'outside', 'toward', 'towards']
};

export const ambiguousConfidenceThreshold = 8;
export const lowEvidenceThreshold = 20;