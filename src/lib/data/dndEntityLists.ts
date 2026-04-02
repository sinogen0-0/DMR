/**
 * D&D-specific entity lists and classification logic
 * Used by extraction service to identify and categorize entities
 */

export const dndEntityLists = {
  npcTitles: [
    'Lord', 'Lady', 'King', 'Queen', 'Prince', 'Princess',
    'Duke', 'Duchess', 'Baron', 'Baroness', 'Earl', 'Countess',
    'Captain', 'Commander', 'General', 'Sergeant', 'Guard',
    'Master', 'Mistress', 'Sir', 'Dame', 'Mayor', 'Governor',
    'Elder', 'Sage', 'Wizard', 'Sorcerer', 'Cleric', 'Druid',
    'Ranger', 'Paladin', 'Monk', 'Bard', 'Rogue', 'Thief',
    'Priest', 'Bishop', 'High Priestess', 'Oracle',
    'Knight', 'Noble', 'Merchant', 'Beggar', 'Tavern'
  ],

  locationSuffixes: [
    'shire', 'dale', 'ford', 'burg', 'port', 'haven',
    'wood', 'forest', 'grove', 'glen', 'vale', 'plain',
    'peak', 'mountain', 'hill', 'isle', 'island',
    'keep', 'castle', 'tower', 'fortress', 'dungeon'
  ],

  locationPrefixes: [
    'The', 'Dark', 'Ancient', 'Lost', 'Forsaken', 'Blessed',
    'Cursed', 'Enchanted', 'Shadow', 'Silver', 'Golden',
    'Crystal', 'Sunken', 'Floating', 'Hidden', "King's"
  ],

  plotKeywords: [
    'quest', 'defeat', 'defeated', 'slay', 'slayed', 'kill', 'killed',
    'rescue', 'save', 'saved', 'protect', 'protected', 'find', 'found',
    'retrieve', 'destroy', 'destroyed', 'obtain', 'obtained',
    'discover', 'discovered', 'uncover', 'uncovered', 'reveal', 'revealed',
    'investigate', 'investigated', 'explore', 'explored', 'conquer', 'conquered',
    'betray', 'betrayed', 'curse', 'cursed', 'bless', 'blessed',
    'plot', 'scheme', 'plan', 'conspiracy', 'prophecy', 'doom'
  ],

  dndRaces: [
    'Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn',
    'Gnome', 'Half-Orc', 'Half-Elf', 'Tiefling', 'Orc',
    'Goblin', 'Kobold', 'Drow', 'Eladrin', 'Genasi'
  ],

  dndClasses: [
    'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter',
    'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer',
    'Warlock', 'Wizard', 'Artificer', 'Mystic', 'Bloodhunter'
  ]
};

/**
 * Classify entity type based on name and surrounding context
 * Returns type and confidence score (0-100)
 */
export function classifyEntityType(
  entity: string,
  context: string
): { type: 'NPC' | 'LOCATION' | 'STORY_PLOT' | 'PLAYER_CHARACTER'; confidence: number } {
  const lowerEntity = entity.toLowerCase();
  const lowerContext = context.toLowerCase();

  let scores = {
    NPC: 0,
    LOCATION: 0,
    STORY_PLOT: 0,
    PLAYER_CHARACTER: 0
  };

  // NPC detection: titles, races, classes
  dndEntityLists.npcTitles.forEach(title => {
    if (lowerContext.includes(title.toLowerCase())) {
      scores.NPC += 15;
    }
  });

  dndEntityLists.dndRaces.forEach(race => {
    if (lowerContext.includes(race.toLowerCase())) {
      scores.NPC += 10;
    }
  });

  dndEntityLists.dndClasses.forEach(cls => {
    if (lowerContext.includes(cls.toLowerCase())) {
      scores.NPC += 10;
    }
  });

  // Location detection: suffixes and prefixes
  dndEntityLists.locationSuffixes.forEach(suffix => {
    if (lowerEntity.endsWith(suffix)) {
      scores.LOCATION += 30;
    }
  });

  dndEntityLists.locationPrefixes.forEach(prefix => {
    if (lowerContext.includes(prefix.toLowerCase())) {
      scores.LOCATION += 10;
    }
  });

  // Story Plot detection: action keywords
  dndEntityLists.plotKeywords.forEach(keyword => {
    if (lowerContext.includes(keyword)) {
      scores.STORY_PLOT += 5;
    }
  });

  // Character detection: player-specific indicators
  ['player', 'character', 'hero', 'adventurer', 'party', 'companion', 'ally'].forEach(indicator => {
    if (lowerContext.includes(indicator)) {
      scores.PLAYER_CHARACTER += 10;
    }
  });

  // Determine type (highest score) and confidence
  let type: 'NPC' | 'LOCATION' | 'STORY_PLOT' | 'PLAYER_CHARACTER' = 'NPC'; // default
  let confidence = 0;

  Object.entries(scores).forEach(([key, value]) => {
    if (value > confidence) {
      confidence = value;
      type = key as 'NPC' | 'LOCATION' | 'STORY_PLOT' | 'PLAYER_CHARACTER';
    }
  });

  // Normalize confidence to 0-100 scale (20-100 range for base score)
  confidence = Math.min(100, Math.max(20, Math.round(confidence * 3)));

  return { type, confidence };
}
