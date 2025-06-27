// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * AI orchestration type definitions
 * Defines types for multi-model AI coordination, escalation, and response management
 */

export interface AIConfig {
  models: ModelAssignment;
  escalation: EscalationConfig;
  fallback: FallbackConfig;
  usage: UsageConfig;
  performance: PerformanceConfig;
}

export interface ModelAssignment {
  primary: AIModelId;
  reasoning: AIModelId;
  function_calling: AIModelId;
  escalation: AIModelId[];
  fallback: AIModelId;
  specialized: Record<AITaskType, AIModelId>;
}

export interface EscalationConfig {
  enabled: boolean;
  triggers: EscalationTrigger[];
  cooldownPeriod: number; // seconds
  maxEscalations: number;
  models: EscalationModelConfig[];
}

export interface EscalationTrigger {
  type: EscalationTriggerType;
  threshold: number;
  priority: number;
  conditions?: EscalationCondition[];
}

export interface EscalationCondition {
  field: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'contains';
  value: unknown;
}

export interface EscalationModelConfig {
  modelId: AIModelId;
  triggerTypes: EscalationTriggerType[];
  priority: number;
  costMultiplier: number;
  maxDuration: number; // seconds
}

export interface FallbackConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number; // seconds
  gracefulDegradation: boolean;
  offlineMode: boolean;
}

export interface UsageConfig {
  tracking: boolean;
  costLimits: CostLimits;
  rateLimit: RateLimit;
  analytics: AnalyticsConfig;
}

export interface CostLimits {
  dailyLimit: number;
  monthlyLimit: number;
  perSessionLimit: number;
  alertThresholds: number[];
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackPerformance: boolean;
  trackCosts: boolean;
  trackUserSatisfaction: boolean;
  retentionPeriod: number; // days
}

export interface PerformanceConfig {
  timeout: number; // seconds
  maxConcurrent: number;
  caching: CachingConfig;
  optimization: OptimizationConfig;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // MB
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface OptimizationConfig {
  preloadContext: boolean;
  batchRequests: boolean;
  compressPrompts: boolean;
  pruneContext: boolean;
}

// AI Task Types and Processing
export enum AITaskType {
  INTENT_DETECTION = 'intent_detection',
  NARRATIVE_GENERATION = 'narrative_generation',
  STORY_REASONING = 'story_reasoning',
  FRUSTRATION_ANALYSIS = 'frustration_analysis',
  WORLD_BUILDING = 'world_building',
  CHARACTER_DIALOGUE = 'character_dialogue',
  CHOICE_GENERATION = 'choice_generation',
  CONTEXT_SUMMARIZATION = 'context_summarization',
  ERROR_RECOVERY = 'error_recovery',
  QUALITY_ASSESSMENT = 'quality_assessment',
}

export enum EscalationTriggerType {
  USER_FRUSTRATION = 'user_frustration',
  STORY_COMPLEXITY = 'story_complexity',
  MODEL_FAILURE = 'model_failure',
  EXPLICIT_REQUEST = 'explicit_request',
  QUALITY_DEGRADATION = 'quality_degradation',
  PERFORMANCE_ISSUE = 'performance_issue',
  CONTEXT_OVERFLOW = 'context_overflow',
}

export enum AIModelId {
  /**
   * Role-based model assignments for game orchestration
   * Models can be updated without changing application logic
   */
  PRIMARY_NARRATIVE = 'primary_narrative',           // Main storytelling and complex reasoning
  FAST_INTENT = 'fast_intent',                      // High-speed intent detection and simple tasks
  EMPATHETIC_ESCALATION = 'empathetic_escalation',  // User frustration handling with empathy
  CREATIVE_ESCALATION = 'creative_escalation',      // Top-tier creative and complex scenarios
}

export interface PlayerProfile {
  id: string;
  preferences: PlayerPreferences;
  playStyle: PlayStyle;
  history: PlayerHistory;
  frustrationLevel: number;
  engagement: EngagementMetrics;
}

export interface PlayerPreferences {
  difficulty: GameDifficulty;
  narrativeStyle: 'descriptive' | 'concise' | 'atmospheric' | 'action-packed';
  aiPersonality: 'helpful' | 'challenging' | 'immersive' | 'educational';
  contentFilters: ContentFilter[];
  accessibility: AccessibilityOptions;
}

export interface PlayStyle {
  exploration: number; // 0-1 scale
  combat: number;
  dialogue: number;
  puzzle: number;
  speedrun: boolean;
  completionist: boolean;
  roleplay: boolean;
}

export interface PlayerHistory {
  totalPlaytime: number;
  sessionsCompleted: number;
  averageSessionLength: number;
  preferredGenres: string[];
  completionRate: number;
  escalationHistory: EscalationEvent[];
}

export interface EngagementMetrics {
  currentSession: SessionEngagement;
  historical: HistoricalEngagement;
  trends: EngagementTrend[];
}

export interface SessionEngagement {
  startTime: Date;
  actionsPerMinute: number;
  averageResponseTime: number;
  frustrationEvents: number;
  positiveIndicators: number;
  immersionScore: number;
}

export interface HistoricalEngagement {
  averageImmersionScore: number;
  retentionRate: number;
  recommendationScore: number;
  completionRate: number;
}

export interface EngagementTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  timeframe: number; // days
}

export interface ContentFilter {
  type: 'violence' | 'language' | 'adult_themes' | 'horror' | 'discrimination';
  level: 'none' | 'mild' | 'moderate' | 'strict';
}

export interface AccessibilityOptions {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  slowMode: boolean;
  verboseDescriptions: boolean;
  colorBlindness?: 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface SessionMetadata {
  sessionId: string;
  startTime: Date;
  clientType: string;
  ipAddress?: string;
  userAgent?: string;
  language: string;
  timezone: string;
}

// AI Response Types
export interface AIResponse {
  taskType: AITaskType;
  modelUsed: AIModelId;
  narrativeResponse: string;
  stateUpdates: Record<string, unknown>;
  newChoices: string[];
  confidence: number;
  escalated: boolean;
  processingTime: number;
  tokensUsed: number;
  cost: number;
  metadata: AIResponseMetadata;
}

export interface AIResponseMetadata {
  promptTokens: number;
  responseTokens: number;
  reasoningSteps?: string[];
  alternativeResponses?: string[];
  qualityScore: number;
  coherenceScore: number;
  creativityScore: number;
  appropriatenessScore: number;
  warnings?: string[];
  debugInfo?: Record<string, unknown>;
}

export interface ModelChoice {
  primary: AIModelId;
  fallback?: AIModelId;
  mode?: 'standard' | 'function_calling' | 'reasoning' | 'creative';
  reasoning: string;
  contextWindow?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason?: string;
  targetModel?: AIModelId;
  duration?: number; // seconds
  priority?: number;
  conditions?: EscalationCondition[];
}

export interface EscalationState {
  playerId: string;
  active: boolean;
  currentModel: AIModelId;
  escalationReason: string;
  startTime: Date;
  endTime?: Date;
  triggerCount: number;
  effectiveness?: number;
}

export interface EscalationEvent {
  timestamp: Date;
  triggerType: EscalationTriggerType;
  fromModel: AIModelId;
  toModel: AIModelId;
  reason: string;
  duration: number;
  effectiveness: number;
  playerSatisfaction?: number;
}

// Frustration Detection
export interface FrustrationAnalysis {
  score: number; // 0-1 scale
  indicators: FrustrationIndicator[];
  patterns: FrustrationPattern[];
  recommendations: FrustrationRecommendation[];
  confidence: number;
}

export interface FrustrationIndicator {
  type:
    | 'text_pattern'
    | 'behavior_pattern'
    | 'timing_pattern'
    | 'repetition_pattern';
  description: string;
  weight: number;
  evidence: string[];
}

export interface FrustrationPattern {
  name: string;
  frequency: number;
  severity: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  timeframe: number; // minutes
}

export interface FrustrationRecommendation {
  action:
    | 'escalate'
    | 'provide_hint'
    | 'simplify_language'
    | 'offer_help'
    | 'change_approach';
  priority: number;
  reasoning: string;
  expectedEffectiveness: number;
}

// Usage Metrics and Analytics
export interface UsageMetrics {
  playerId: string;
  sessionId: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  escalationRate: number;
  modelUsage: Record<AIModelId, ModelUsageStats>;
  taskDistribution: Record<AITaskType, number>;
}

export interface ModelUsageStats {
  requests: number;
  tokens: number;
  cost: number;
  averageResponseTime: number;
  successRate: number;
  averageQuality: number;
}

// Re-import types from other modules that are needed here
import type {
  StoryBeat,
  GameState,
  StoryProgress,
  GameDifficulty,
} from './game.js';

// Re-export PlayerInteraction for use in AI modules
export type { PlayerInteraction } from './game.js';

export interface GameContext {
  currentBeat: StoryBeat;
  recentInteractions: import('./game.js').PlayerInteraction[];
  gameState: GameState;
  storyProgress: StoryProgress;
  playerProfile: PlayerProfile;
  sessionMetadata: SessionMetadata;
}

// Utility types
export type AIModelConfig = Record<AIModelId, ModelConfiguration>;

// Default model configuration mapping (as of Q2 2025)
export const DEFAULT_MODEL_CONFIG: AIModelConfig = {
  [AIModelId.PRIMARY_NARRATIVE]: {
    actualModelId: 'gemini-2.5-pro',
    provider: 'google',
    apiKey: process.env.GOOGLE_AI_API_KEY ?? '',
    maxTokens: 8192,
    temperature: 0.7,
    timeout: 30,
    retries: 3,
    costPerToken: 0.00003,
    capabilities: [
      { type: 'text_generation', quality: 0.95, speed: 0.7, cost: 0.3 },
      { type: 'reasoning', quality: 0.9, speed: 0.6, cost: 0.3 },
    ],
  },
  [AIModelId.FAST_INTENT]: {
    actualModelId: 'gemini-2.5-flash',
    provider: 'google',
    apiKey: process.env.GOOGLE_AI_API_KEY ?? '',
    maxTokens: 2048,
    temperature: 0.3,
    timeout: 10,
    retries: 2,
    costPerToken: 0.000015,
    capabilities: [
      { type: 'text_generation', quality: 0.8, speed: 0.95, cost: 0.9 },
      { type: 'function_calling', quality: 0.85, speed: 0.9, cost: 0.9 },
    ],
  },
  [AIModelId.EMPATHETIC_ESCALATION]: {
    actualModelId: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    maxTokens: 4096,
    temperature: 0.8,
    timeout: 25,
    retries: 3,
    costPerToken: 0.00006,
    capabilities: [
      { type: 'text_generation', quality: 0.95, speed: 0.75, cost: 0.2 },
      { type: 'reasoning', quality: 0.92, speed: 0.7, cost: 0.2 },
    ],
  },
  [AIModelId.CREATIVE_ESCALATION]: {
    actualModelId: 'claude-opus-4-20250514',
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    maxTokens: 4096,
    temperature: 0.9,
    timeout: 45,
    retries: 2,
    costPerToken: 0.00015,
    capabilities: [
      { type: 'text_generation', quality: 0.98, speed: 0.5, cost: 0.1 },
      { type: 'reasoning', quality: 0.95, speed: 0.45, cost: 0.1 },
      { type: 'multimodal', quality: 0.9, speed: 0.4, cost: 0.1 },
    ],
  },
};

export interface ModelConfiguration {
  actualModelId: string;                 // The real model ID (e.g., 'gemini-2.5-pro', 'claude-sonnet-4-20250514')
  provider: 'google' | 'anthropic';      // AI provider
  apiKey: string;
  endpoint?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retries: number;
  costPerToken: number;
  capabilities: ModelCapability[];
}

export interface ModelCapability {
  type: 'text_generation' | 'function_calling' | 'reasoning' | 'multimodal';
  quality: number; // 0-1 scale
  speed: number; // 0-1 scale
  cost: number; // 0-1 scale, lower is better
}

export interface AIModelUsage {
  model: string;
  taskType: string;
  timestamp: number;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  successful: boolean;
  escalated: boolean;
}
