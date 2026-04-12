import type { Dossier } from '$lib/types';

// ── Discriminated subtypes ───────────────────────────────────────

export interface NPCDossier extends Dossier {
  type: 'NPC';
  /** Faction or organisation the NPC belongs to */
  faction?: string;
  /** Role or occupation (e.g. blacksmith, wizard, guard captain) */
  role?: string;
  /** Current status */
  status?: 'alive' | 'dead' | 'unknown';
  /** Known locations this NPC frequents or inhabits */
  locationsKnown?: string[];
  notes?: string;
}

export interface CharacterDossier extends Dossier {
  type: 'PLAYER_CHARACTER';
  /** The player's real name */
  playerName?: string;
  /** D&D class (Fighter, Rogue, Wizard, etc.) */
  characterClass?: string;
  /** D&D race (Human, Elf, Dwarf, etc.) */
  race?: string;
  /** Current character level */
  level?: number;
  notes?: string;
}

export interface LocationDossier extends Dossier {
  type: 'LOCATION';
  /** Broader region this location belongs to */
  region?: string;
  /** Location category (dungeon, town, wilderness, tavern, keep, etc.) */
  locationType?: string;
  /** Distinct features, factions, or points of interest */
  notableFeatures?: string[];
  notes?: string;
}

export interface PlotDossier extends Dossier {
  type: 'STORY_PLOT';
  /** Current plot status */
  plotStatus?: 'active' | 'resolved' | 'abandoned';
  /** Names/IDs of parties involved */
  partiesInvolved?: string[];
  notes?: string;
}

/** Discriminated union of all specialised dossier types */
export type AnyDossier = NPCDossier | CharacterDossier | LocationDossier | PlotDossier;

// ── Filter/sort helpers ──────────────────────────────────────────

export type DossierSortField = 'name' | 'createdAt' | 'updatedAt';

export interface DossierFilter {
  type?: Dossier['type'];
  search?: string;
  sortBy?: DossierSortField;
  sortDir?: 'asc' | 'desc';
  limit?: number;
}
