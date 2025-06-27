// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * AI Orchestrator
 * Central coordinator for multi-model AI interactions in the game
 */

import { PromptBuilder } from './PromptBuilder.js';
import { FrustrationDetector } from './FrustrationDetector.js';
import { ModelFactory } from './models/ModelFactory.js';
import { AIActionResponse, AIActionResponseSchema } from '@/schemas/ai.js';
import { 
  AIModelId, 
  GameContext, 
  FrustrationAnalysis 
} from '@/types/ai.js';
import { HybridDatabase } from '@/database/HybridDatabase.js';

export class AIOrchestrator {
  private promptBuilder: PromptBuilder;
  private frustrationDetector: FrustrationDetector;

  constructor(private database: HybridDatabase) {
    this.promptBuilder = new PromptBuilder();
    this.frustrationDetector = new FrustrationDetector();
  }

  /**
   * Process a player action and generate AI response
   */
  public async processPlayerAction(gameId: string, userInput: string): Promise<AIActionResponse> {
    try {
      // 1. Fetch game context
      const context = await this.fetchGameContext(gameId);
      
      // 2. Detect frustration level
      const frustrationAnalysis = this.frustrationDetector.analyzeFrustration(
        context.recentInteractions,
        context.playerProfile
      );
      
      // 3. Select appropriate model based on frustration and context
      const modelId = this.selectModel(frustrationAnalysis, context);
      
      // 4. Build prompt using templating engine
      const prompt = this.promptBuilder.buildNarrativePrompt(context, userInput);
      
      // 5. Generate response
      const model = ModelFactory.getModel(modelId);
      const modelResponse = await model.generate(prompt, { isJsonOutput: true });
      
      // 6. Parse and validate response
      const parsedResponse = this.parseResponse(modelResponse.content);
      
      // 7. Record interaction and metrics
      await this.recordInteraction(gameId, userInput, parsedResponse, modelResponse.metadata, frustrationAnalysis);
      
      return parsedResponse;
      
    } catch (error) {
      console.error('AI Orchestrator error:', error);
      
      // Fallback response
      return this.generateFallbackResponse(userInput);
    }
  }

  /**
   * Detect player intent for fast processing
   */
  public async detectIntent(gameId: string, userInput: string): Promise<unknown> {
    try {
      const context = await this.fetchGameContext(gameId);
      const prompt = this.promptBuilder.buildIntentDetectionPrompt(context, userInput);
      
      const model = ModelFactory.getModel(AIModelId.FAST_INTENT);
      const response = await model.generate(prompt, { 
        isJsonOutput: true,
        maxTokens: 512,
        temperature: 0.3
      });
      
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Intent detection error:', error);
      return {
        intent: 'UNCLEAR',
        confidence: 0.1,
        parameters: {},
        reasoning: 'Failed to detect intent due to processing error'
      };
    }
  }

  /**
   * Select the appropriate AI model based on context and frustration
   */
  private selectModel(frustrationAnalysis: FrustrationAnalysis, context: GameContext): AIModelId {
    // High frustration triggers empathetic escalation
    if (frustrationAnalysis.score > 0.7) {
      return AIModelId.EMPATHETIC_ESCALATION;
    }
    
    // Very high complexity or creative scenarios
    if (this.requiresCreativeEscalation(context)) {
      return AIModelId.CREATIVE_ESCALATION;
    }
    
    // Default to primary narrative model
    return AIModelId.PRIMARY_NARRATIVE;
  }

  /**
   * Check if context requires creative escalation
   */
  private requiresCreativeEscalation(context: GameContext): boolean {
    // Check for complex story beats or high-stakes scenarios
    const complexityIndicators = [
      context.currentBeat.objectives.length > 3,
      context.gameState.location?.includes('boss') || false,
    ];
    
    return complexityIndicators.filter(Boolean).length >= 2;
  }

  /**
   * Parse and validate AI model response
   */
  private parseResponse(content: string): AIActionResponse {
    try {
      const parsed = JSON.parse(content);
      return AIActionResponseSchema.parse(parsed);
    } catch (error) {
      console.error('Response parsing error:', error);
      throw new Error(`Invalid AI response format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate fallback response when AI fails
   */
  private generateFallbackResponse(_userInput: string): AIActionResponse {
    return {
      narrativeResponse: "I need a moment to process your action. The mystical energies around you seem to fluctuate, making it difficult to predict what happens next.",
      stateUpdates: {},
      newChoices: [
        "Wait and observe your surroundings",
        "Try a different approach",
        "Ask for guidance"
      ],
      confidence: 0.1,
      metadata: {
        reasoning: "Fallback response due to AI processing error",
        warnings: ["AI model temporarily unavailable"]
      }
    };
  }

  /**
   * Fetch comprehensive game context for AI processing
   */
  private async fetchGameContext(gameId: string): Promise<GameContext> {
    // This would fetch from the database - simplified for now
    // In a real implementation, this would pull from HybridDatabase
    throw new Error('fetchGameContext not implemented - requires database integration');
  }

  /**
   * Record player interaction and AI response metrics
   */
  private async recordInteraction(
    _gameId: string,
    userInput: string,
    response: AIActionResponse,
    modelMetadata: unknown,
    frustrationAnalysis: FrustrationAnalysis
  ): Promise<void> {
    // Record to database for analytics and future context
    // This would use the HybridDatabase to store interaction data
    // eslint-disable-next-line no-console
    console.log('Recording interaction:', {
      gameId: _gameId,
      userInput: `${userInput.substring(0, 50)}...`,
      confidence: response.confidence,
      frustrationScore: frustrationAnalysis.score,
      modelUsed: (modelMetadata as any)?.modelUsed || 'unknown',
      cost: (modelMetadata as any)?.cost || 0
    });
  }

  /**
   * Get orchestrator status and metrics
   */
  public async getStatus(_gameId?: string): Promise<{
    modelsAvailable: Record<AIModelId, boolean>;
    totalInteractions: number;
    averageResponseTime: number;
    costToday: number;
  }> {
    const modelsAvailable = await ModelFactory.checkAllModelsAvailability();
    
    return {
      modelsAvailable,
      totalInteractions: 0, // Would fetch from this.database
      averageResponseTime: 0, // Would calculate from recent interactions
      costToday: 0, // Would calculate from today's usage
    };
  }

  /**
   * Preload models and templates for better performance
   */
  public async initialize(): Promise<void> {
    await this.promptBuilder.precompileTemplates();
    await ModelFactory.checkAllModelsAvailability();
  }
}