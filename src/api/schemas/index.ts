import { z } from 'zod';

// Common schemas
export const UuidSchema = z.string().uuid('Invalid UUID format');
export const TimestampSchema = z.string().datetime('Invalid timestamp format').or(z.date());

// Player schemas
export const CreatePlayerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format').optional(),
  preferences: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    narrativeStyle: z.enum(['descriptive', 'concise', 'atmospheric', 'action-packed']).default('descriptive'),
    aiPersonality: z.enum(['helpful', 'challenging', 'immersive', 'educational']).default('helpful'),
  }).optional(),
});

export const UpdatePlayerSchema = CreatePlayerSchema.partial();

export const PlayerParamsSchema = z.object({
  id: UuidSchema,
});

// Game schemas
export const CreateGameSchema = z.object({
  storyId: z.string().min(1, 'Story ID is required'),
  playerId: UuidSchema,
  settings: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    autoSave: z.boolean().default(true),
    maxTurns: z.number().int().min(1).max(1000).optional(),
  }).optional(),
});

export const GameActionSchema = z.object({
  action: z.string().min(1, 'Action is required').max(1000, 'Action too long'),
  metadata: z.object({
    timestamp: TimestampSchema.optional(),
    actionType: z.enum(['move', 'interact', 'speak', 'examine', 'use', 'other']).optional(),
    context: z.record(z.unknown()).optional(),
  }).optional(),
});

export const GameParamsSchema = z.object({
  id: UuidSchema,
});

export const SaveGameSchema = z.object({
  name: z.string().min(1, 'Save name is required').max(100, 'Save name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

// Story schemas
export const StoryParamsSchema = z.object({
  id: z.string().min(1, 'Story ID is required'),
});

export const StoryQuerySchema = z.object({
  genre: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tags: z.string().optional(), // Comma-separated tags
  search: z.string().max(100, 'Search term too long').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// WebSocket message schemas
export const WebSocketMessageSchema = z.object({
  type: z.string().min(1, 'Message type is required'),
  payload: z.record(z.unknown()).optional(),
  timestamp: TimestampSchema.optional(),
});

export const JoinGameMessageSchema = z.object({
  type: z.literal('join_game'),
  payload: z.object({
    gameId: UuidSchema,
    playerId: UuidSchema.optional(),
  }),
});

export const LeaveGameMessageSchema = z.object({
  type: z.literal('leave_game'),
  payload: z.object({}).optional(),
});

// Response schemas for documentation
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
    path: z.array(z.union([z.string(), z.number()])),
  })).optional(),
  timestamp: z.string(),
  path: z.string(),
});

export const PlayerResponseSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  email: z.string().optional(),
  preferences: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']),
    narrativeStyle: z.enum(['descriptive', 'concise', 'atmospheric', 'action-packed']),
    aiPersonality: z.enum(['helpful', 'challenging', 'immersive', 'educational']),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const GameResponseSchema = z.object({
  id: UuidSchema,
  storyId: z.string(),
  playerId: UuidSchema,
  status: z.enum(['active', 'paused', 'completed', 'abandoned']),
  currentBeat: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastActivity: z.string(),
});

export const StoryMetadataResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  author: z.string(),
  version: z.string(),
  genre: z.array(z.string()),
  tags: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedPlaytime: z.number(),
  contentWarnings: z.array(z.string()),
  isAvailable: z.boolean(),
});

// Type exports
export type CreatePlayerRequest = z.infer<typeof CreatePlayerSchema>;
export type UpdatePlayerRequest = z.infer<typeof UpdatePlayerSchema>;
export type CreateGameRequest = z.infer<typeof CreateGameSchema>;
export type GameActionRequest = z.infer<typeof GameActionSchema>;
export type SaveGameRequest = z.infer<typeof SaveGameSchema>;
export type StoryQueryRequest = z.infer<typeof StoryQuerySchema>;
export type WebSocketMessageRequest = z.infer<typeof WebSocketMessageSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type PlayerResponse = z.infer<typeof PlayerResponseSchema>;
export type GameResponse = z.infer<typeof GameResponseSchema>;
export type StoryMetadataResponse = z.infer<typeof StoryMetadataResponseSchema>;