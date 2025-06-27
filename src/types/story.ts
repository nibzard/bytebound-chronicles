// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Story system type definitions
 * Defines the structure for story files, metadata, and content management
 */

export interface StoryFile {
  metadata: StoryMetadata;
  beats: StoryBeat[];
  characters: Character[];
  items: Item[];
  endings: Ending[];
  worldState?: WorldState;
}

export interface StoryMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  version: string;
  difficulty: GameDifficulty;
  estimatedLength: number; // minutes
  tags: string[];
  contentWarnings?: string[];
  minAge?: number;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  publicationStatus: 'draft' | 'published' | 'archived';
  rating?: number;
  playCount?: number;
}

export interface StoryFilters {
  difficulty?: GameDifficulty;
  tags?: string[];
  maxLength?: number;
  minRating?: number;
  language?: string;
  author?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string[];
  appearance?: string;
  background?: string;
  knowledge: string[];
  relationships: Record<string, CharacterRelationship>;
  dialogue?: DialogueSet;
  states?: Record<string, CharacterState>;
}

export interface CharacterRelationship {
  type:
    | 'friend'
    | 'enemy'
    | 'neutral'
    | 'romantic'
    | 'family'
    | 'ally'
    | 'rival';
  strength: number; // -100 to 100
  history?: string;
  secretsKnown?: string[];
}

export interface CharacterState {
  mood: string;
  location: string;
  alive: boolean;
  trust: number;
  suspicion: number;
  customProperties?: Record<string, unknown>;
}

export interface DialogueSet {
  greeting: string[];
  farewell: string[];
  responses: Record<string, string[]>;
  questions: Record<string, string>;
  rumors?: string[];
  secrets?: ConditionalDialogue[];
}

export interface ConditionalDialogue {
  condition: string;
  dialogue: string[];
  requirementType: 'objective' | 'item' | 'relationship' | 'state';
}

export interface Item {
  id: string;
  name: string;
  description: string;
  properties: ItemProperty[];
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value?: number;
  weight?: number;
  stackable: boolean;
  maxStack?: number;
  usable: boolean;
  consumable: boolean;
  equipable: boolean;
  requirements?: ItemRequirement[];
  effects?: ItemEffect[];
  revealsBeatIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ItemProperty {
  type: string;
  value: unknown;
  description?: string;
}

export interface ItemRequirement {
  type: 'level' | 'attribute' | 'objective' | 'story_progress';
  condition: string;
  value: unknown;
}

export interface ItemEffect {
  type: 'stat_boost' | 'heal' | 'damage' | 'story_unlock' | 'dialogue_option';
  duration: 'instant' | 'temporary' | 'permanent';
  magnitude: number;
  target: string;
  description?: string;
}

export interface Ending {
  id: string;
  title: string;
  description: string;
  type: 'good' | 'bad' | 'neutral' | 'secret' | 'true';
  requirements: EndingRequirement[];
  unlockText: string;
  epilogue?: string;
  rewards?: EndingReward[];
  achievementId?: string;
}

export interface EndingRequirement {
  type: 'objective' | 'choice' | 'state' | 'relationship' | 'item' | 'time';
  condition: string;
  value?: unknown;
  operator?: ComparisonOperator;
  weight?: number; // For weighted ending calculations
}

export interface EndingReward {
  type: 'achievement' | 'unlock' | 'bonus_content' | 'character_unlock';
  id: string;
  description: string;
}

export interface WorldState {
  timeOfDay:
    | 'dawn'
    | 'morning'
    | 'noon'
    | 'afternoon'
    | 'evening'
    | 'night'
    | 'midnight';
  weather: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  daysSinceStart: number;
  globalEvents: GlobalEvent[];
  worldFlags: Record<string, boolean>;
  economicState?: EconomicState;
  politicalState?: PoliticalState;
}

export interface GlobalEvent {
  id: string;
  name: string;
  description: string;
  type: 'political' | 'economic' | 'natural' | 'social' | 'supernatural';
  startDay: number;
  endDay?: number;
  effects: WorldEffect[];
  triggeredBy?: string; // Player action or story beat that triggered this
}

export interface WorldEffect {
  type:
    | 'price_change'
    | 'availability_change'
    | 'npc_behavior'
    | 'dialogue_unlock';
  target: string;
  modifier: number | string;
  description: string;
}

export interface EconomicState {
  inflation: number;
  prosperity: number;
  tradeRoutes: TradeRoute[];
  marketPrices: Record<string, number>;
}

export interface TradeRoute {
  id: string;
  origin: string;
  destination: string;
  goods: string[];
  active: boolean;
  danger: number;
}

export interface PoliticalState {
  stability: number;
  warState: boolean;
  alliances: Alliance[];
  tensions: Record<string, number>;
}

export interface Alliance {
  id: string;
  factions: string[];
  type: 'trade' | 'military' | 'marriage' | 'temporary';
  strength: number;
  established: number; // Day established
}

// Story progression and context
export interface StoryContent {
  currentBeat: StoryBeat;
  availableTransitions: Transition[];
  storyId: string;
  loadedAt: Date;
}

export interface StoryValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    totalBeats: number;
    totalCharacters: number;
    totalItems: number;
    totalEndings: number;
    estimatedPlaytime: number;
  };
}

export interface ValidationError {
  type:
    | 'missing_beat'
    | 'invalid_transition'
    | 'broken_reference'
    | 'invalid_format';
  severity: 'error' | 'warning';
  message: string;
  location?: string;
  suggestions?: string[];
}

export interface ValidationWarning {
  type:
    | 'unreachable_beat'
    | 'dead_end'
    | 'balance_issue'
    | 'style_inconsistency';
  message: string;
  location?: string;
  impact: 'low' | 'medium' | 'high';
}

// Re-import types from game.ts that are needed here
import type { GameDifficulty, StoryBeat, Transition } from './game.js';

// Utility types
export type ComparisonOperator =
  | 'equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'not_equals'
  | 'contains';
export type CharacterId = string;
export type ItemId = string;
export type EndingId = string;
