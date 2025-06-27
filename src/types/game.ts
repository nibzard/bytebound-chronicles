// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Core game type definitions
 * These types define the fundamental game structures and state management
 */

export interface GameSession {
  id: string;
  storyId: string;
  playerId: string;
  currentBeat: StoryBeat;
  gameState: GameState;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface GameState {
  location: string;
  act: number;
  completedObjectives: string[];
  playerStats: PlayerStats;
  inventory: InventoryItem[];
  storyVariables: Record<string, unknown>;
  endings: Record<string, number>; // Ending implications tracking
  characterRelationships: Record<string, number>; // Character relationship scores
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  experience: number;
  level: number;
  attributes: Record<string, number>;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  properties: string[];
  metadata?: Record<string, unknown>;
}

export interface StoryBeat {
  id: string;
  act: 1 | 2 | 3;
  title: string;
  description: string;
  setting: BeatSetting;
  objectives: Objective[];
  exitTransitions: Transition[];
  aiGuidance: AIGuidance;
  isInitial?: boolean;
  isEnding?: boolean;
}

export interface BeatSetting {
  location: string;
  timeOfDay: string;
  atmosphere: string;
  weather?: string;
  ambientSounds?: string[];
}

export interface Objective {
  id: string;
  description: string;
  type: 'required' | 'optional' | 'hidden';
  completionHints: string[];
  weight: number;
  isCompleted?: boolean;
  completedAt?: Date;
}

export interface Transition {
  targetBeatId: string;
  requirements: Requirement[];
  weight: number;
  description?: string;
  isHidden?: boolean;
}

export interface Requirement {
  type: 'objective' | 'choice' | 'state' | 'random' | 'item' | 'character';
  condition: string;
  value?: unknown;
  operator?:
    | 'equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'not_equals';
}

export interface AIGuidance {
  tone: string;
  style: string;
  keyThemes: string[];
  avoidTopics: string[];
  characterFocus?: string[];
  suggestedActions?: string[];
}

export interface GameSave {
  id: string;
  playerId: string;
  storyId: string;
  saveName: string;
  gameState: GameState;
  currentBeatId: string;
  createdAt: Date;
  description?: string;
  screenshot?: string; // Base64 encoded image for save preview
}

export interface PlayerInteraction {
  id: string;
  playerId: string;
  gameId: string;
  input: string;
  response: string;
  timestamp: number;
  beatId: string;
  aiModel?: string;
  escalated?: boolean;
  metadata?: InteractionMetadata;
}

export interface InteractionMetadata {
  processingTime: number;
  confidence: number;
  tokensUsed: number;
  cost: number;
  clientType: string;
  frustrated?: boolean;
  escalationReason?: string;
}

export interface ActionResponse {
  response: string;
  gameState?: Partial<GameState>;
  choices?: string[];
  newObjectives?: Objective[];
  completedObjectives?: string[];
  stateUpdates?: Record<string, unknown>;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  model: string;
  escalated: boolean;
  confidence: number;
  processingTime: number;
  tokensUsed: number;
  cost: number;
  suggestions?: string[];
}

export interface ClientGameState {
  gameId: string;
  currentBeat: StoryBeat;
  playerState?: {
    health: number;
    location: string;
    level: number;
    inventory: InventoryItem[];
  };
  isConnected: boolean;
  lastUpdate: Date;
}

// Enums for better type safety
export enum GameEventType {
  GAME_STARTED = 'game_started',
  ACTION_TAKEN = 'action_taken',
  OBJECTIVE_COMPLETED = 'objective_completed',
  BEAT_CHANGED = 'beat_changed',
  GAME_SAVED = 'game_saved',
  GAME_LOADED = 'game_loaded',
  ESCALATION_TRIGGERED = 'escalation_triggered',
  ERROR_OCCURRED = 'error_occurred',
}

export enum PlayerActionType {
  NARRATIVE = 'narrative',
  EXAMINE = 'examine',
  INTERACT = 'interact',
  MOVE = 'move',
  USE_ITEM = 'use_item',
  TALK = 'talk',
  SYSTEM = 'system',
}

export enum GameDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export interface StoryProgress {
  storyId: string;
  playerId: string;
  currentBeatId: string;
  completedBeats: string[];
  visitedLocations: string[];
  metCharacters: string[];
  discoveredSecrets: string[];
  endingImplications: Record<string, number>;
  lastPlayed: Date;
  totalPlayTime: number; // minutes
}

// Utility types for better type inference
export type GameStateUpdate = Partial<GameState>;
export type ObjectiveId = string;
export type BeatId = string;
export type PlayerId = string;
export type GameId = string;
export type StoryId = string;
