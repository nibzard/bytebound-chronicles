// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Zod validation schemas for game types
 * These schemas provide runtime validation for game data structures
 */

import { z } from 'zod';

// Enums
export const GameEventTypeSchema = z.enum([
  'game_started',
  'action_taken',
  'objective_completed',
  'beat_changed',
  'game_saved',
  'game_loaded',
  'escalation_triggered',
  'error_occurred',
]);

export const PlayerActionTypeSchema = z.enum([
  'narrative',
  'examine',
  'interact',
  'move',
  'use_item',
  'talk',
  'system',
]);

export const GameDifficultySchema = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

// Basic schemas
export const PlayerStatsSchema = z.object({
  health: z.number().min(0),
  maxHealth: z.number().min(1),
  experience: z.number().min(0),
  level: z.number().min(1),
  attributes: z.record(z.string(), z.number()),
});

export const InventoryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  quantity: z.number().min(0),
  properties: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const BeatSettingSchema = z.object({
  location: z.string().min(1),
  timeOfDay: z.string().min(1),
  atmosphere: z.string().min(1),
  weather: z.string().optional(),
  ambientSounds: z.array(z.string()).optional(),
});

export const ObjectiveSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['required', 'optional', 'hidden']),
  completionHints: z.array(z.string()),
  weight: z.number().min(0),
  isCompleted: z.boolean().optional(),
  completedAt: z.date().optional(),
});

export const RequirementSchema = z.object({
  type: z.enum(['objective', 'choice', 'state', 'random', 'item', 'character']),
  condition: z.string().min(1),
  value: z.unknown().optional(),
  operator: z
    .enum(['equals', 'greater_than', 'less_than', 'contains', 'not_equals'])
    .optional(),
});

export const TransitionSchema = z.object({
  targetBeatId: z.string().min(1),
  requirements: z.array(RequirementSchema),
  weight: z.number().min(0),
  description: z.string().optional(),
  isHidden: z.boolean().optional(),
});

export const AIGuidanceSchema = z.object({
  tone: z.string().min(1),
  style: z.string().min(1),
  keyThemes: z.array(z.string()),
  avoidTopics: z.array(z.string()),
  characterFocus: z.array(z.string()).optional(),
  suggestedActions: z.array(z.string()).optional(),
});

export const StoryBeatSchema = z.object({
  id: z.string().min(1),
  act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().min(1),
  description: z.string().min(1),
  setting: BeatSettingSchema,
  objectives: z.array(ObjectiveSchema),
  exitTransitions: z.array(TransitionSchema),
  aiGuidance: AIGuidanceSchema,
  isInitial: z.boolean().optional(),
  isEnding: z.boolean().optional(),
});

export const GameStateSchema = z.object({
  location: z.string().min(1),
  act: z.number().min(1).max(3),
  completedObjectives: z.array(z.string()),
  playerStats: PlayerStatsSchema,
  inventory: z.array(InventoryItemSchema),
  storyVariables: z.record(z.string(), z.unknown()),
  endings: z.record(z.string(), z.number()),
  characterRelationships: z.record(z.string(), z.number()),
});

export const GameSessionSchema = z.object({
  id: z.string().min(1),
  storyId: z.string().min(1),
  playerId: z.string().min(1),
  currentBeat: StoryBeatSchema,
  gameState: GameStateSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean(),
});

export const InteractionMetadataSchema = z.object({
  processingTime: z.number().min(0),
  confidence: z.number().min(0).max(1),
  tokensUsed: z.number().min(0),
  cost: z.number().min(0),
  clientType: z.string().min(1),
  frustrated: z.boolean().optional(),
  escalationReason: z.string().optional(),
});

export const PlayerInteractionSchema = z.object({
  id: z.string().min(1),
  playerId: z.string().min(1),
  gameId: z.string().min(1),
  input: z.string().min(1),
  response: z.string().min(1),
  timestamp: z.number().min(0),
  beatId: z.string().min(1),
  aiModel: z.string().optional(),
  escalated: z.boolean().optional(),
  metadata: InteractionMetadataSchema.optional(),
});

export const ResponseMetadataSchema = z.object({
  model: z.string().min(1),
  escalated: z.boolean(),
  confidence: z.number().min(0).max(1),
  processingTime: z.number().min(0),
  tokensUsed: z.number().min(0),
  cost: z.number().min(0),
  suggestions: z.array(z.string()).optional(),
});

export const ActionResponseSchema = z.object({
  response: z.string().min(1),
  gameState: GameStateSchema.partial().optional(),
  choices: z.array(z.string()).optional(),
  newObjectives: z.array(ObjectiveSchema).optional(),
  completedObjectives: z.array(z.string()).optional(),
  stateUpdates: z.record(z.string(), z.unknown()).optional(),
  metadata: ResponseMetadataSchema,
});

export const GameSaveSchema = z.object({
  id: z.string().min(1),
  playerId: z.string().min(1),
  storyId: z.string().min(1),
  saveName: z.string().min(1),
  gameState: GameStateSchema,
  currentBeatId: z.string().min(1),
  createdAt: z.date(),
  description: z.string().optional(),
  screenshot: z.string().optional(),
});

export const ClientGameStateSchema = z.object({
  gameId: z.string().min(1),
  currentBeat: StoryBeatSchema,
  playerState: z
    .object({
      health: z.number().min(0),
      location: z.string().min(1),
      level: z.number().min(1),
      inventory: z.array(InventoryItemSchema),
    })
    .optional(),
  isConnected: z.boolean(),
  lastUpdate: z.date(),
});

// Input validation schemas for API endpoints
export const CreateGameRequestSchema = z.object({
  storyId: z.string().min(1),
  playerId: z.string().min(1),
});

export const GameActionRequestSchema = z.object({
  input: z.string().min(1).max(500),
  metadata: z
    .object({
      timestamp: z.number().min(0),
      clientType: z.string().min(1),
    })
    .optional(),
});

export const SaveGameRequestSchema = z.object({
  saveName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const CreatePlayerRequestSchema = z.object({
  username: z.string().min(1).max(50),
  preferences: z
    .object({
      difficulty: GameDifficultySchema.optional(),
      language: z.string().optional(),
      accessibility: z.record(z.string(), z.boolean()).optional(),
    })
    .optional(),
});

// Response schemas for API endpoints
export const GameSessionResponseSchema = z.object({
  gameId: z.string().min(1),
  currentBeat: StoryBeatSchema,
  gameState: GameStateSchema.optional(),
});

export const PlayerSavesResponseSchema = z.object({
  saves: z.array(GameSaveSchema),
  totalCount: z.number().min(0),
});

export const GameContextResponseSchema = z.object({
  context: z.array(PlayerInteractionSchema),
  totalCount: z.number().min(0),
  hasMore: z.boolean(),
});

// Utility validation functions
export const validateGameSession = (data: unknown) => {
  return GameSessionSchema.safeParse(data);
};

export const validatePlayerInteraction = (data: unknown) => {
  return PlayerInteractionSchema.safeParse(data);
};

export const validateActionResponse = (data: unknown) => {
  return ActionResponseSchema.safeParse(data);
};

export const validateGameState = (data: unknown) => {
  return GameStateSchema.safeParse(data);
};

export const validateStoryBeat = (data: unknown) => {
  return StoryBeatSchema.safeParse(data);
};

// Type inference helpers
export type GameSessionInput = z.infer<typeof GameSessionSchema>;
export type GameStateInput = z.infer<typeof GameStateSchema>;
export type StoryBeatInput = z.infer<typeof StoryBeatSchema>;
export type PlayerInteractionInput = z.infer<typeof PlayerInteractionSchema>;
export type ActionResponseInput = z.infer<typeof ActionResponseSchema>;
export type CreateGameRequestInput = z.infer<typeof CreateGameRequestSchema>;
export type GameActionRequestInput = z.infer<typeof GameActionRequestSchema>;
export type SaveGameRequestInput = z.infer<typeof SaveGameRequestSchema>;
