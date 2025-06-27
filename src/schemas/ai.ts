// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * AI response validation schemas
 * Zod schemas for validating AI model responses and ensuring type safety
 */

import { z } from 'zod';

// Schema for AI narrative generation responses
export const AIActionResponseSchema = z.object({
  narrativeResponse: z.string().min(1, 'Narrative response is required'),
  stateUpdates: z.record(z.unknown()).optional().default({}),
  newChoices: z.array(z.string()).min(1, 'At least one choice is required'),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    reasoning: z.string().optional(),
    alternativeActions: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
  }).optional(),
});

export type AIActionResponse = z.infer<typeof AIActionResponseSchema>;

// Schema for intent detection responses
export const IntentDetectionSchema = z.object({
  intent: z.enum([
    'EXPLORE',
    'INTERACT', 
    'MOVE',
    'COMBAT',
    'DIALOGUE',
    'INVENTORY',
    'META',
    'UNCLEAR'
  ]),
  confidence: z.number().min(0).max(1),
  parameters: z.record(z.unknown()).optional().default({}),
  reasoning: z.string().optional(),
});

export type IntentDetection = z.infer<typeof IntentDetectionSchema>;

// Schema for frustration analysis
export const FrustrationAnalysisSchema = z.object({
  score: z.number().min(0).max(1),
  indicators: z.array(z.object({
    type: z.enum(['text_pattern', 'behavior_pattern', 'timing_pattern', 'repetition_pattern']),
    description: z.string(),
    weight: z.number().min(0).max(1),
    evidence: z.array(z.string()),
  })),
  recommendations: z.array(z.object({
    action: z.enum(['escalate', 'provide_hint', 'simplify_language', 'offer_help', 'change_approach']),
    priority: z.number().min(0).max(1),
    reasoning: z.string(),
  })),
  confidence: z.number().min(0).max(1),
});

export type FrustrationAnalysis = z.infer<typeof FrustrationAnalysisSchema>;

// Schema for AI model responses (generic)
export const AIResponseSchema = z.object({
  content: z.string(),
  metadata: z.object({
    modelUsed: z.string(),
    tokensUsed: z.number().optional(),
    processingTime: z.number().optional(),
    cost: z.number().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;