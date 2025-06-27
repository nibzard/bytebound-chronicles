// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * AI Model Factory
 * Creates and manages AI model instances based on configuration
 */

import { BaseModel } from './BaseModel.js';
import { GeminiModel } from './GeminiModel.js';
import { ClaudeModel } from './ClaudeModel.js';
import { AIModelId, ModelConfiguration, DEFAULT_MODEL_CONFIG } from '@/types/ai.js';

export class ModelFactory {
  private static instances: Map<AIModelId, BaseModel> = new Map();
  private static config = DEFAULT_MODEL_CONFIG;

  /**
   * Get or create a model instance
   */
  public static getModel(modelId: AIModelId): BaseModel {
    if (this.instances.has(modelId)) {
      const instance = this.instances.get(modelId);
      if (!instance) {
        throw new Error(`Model instance not found: ${modelId}`);
      }
      return instance;
    }

    const model = this.createModel(modelId);
    this.instances.set(modelId, model);
    return model;
  }

  /**
   * Create a new model instance
   */
  private static createModel(modelId: AIModelId): BaseModel {
    const config = this.config[modelId];
    
    if (!config) {
      throw new Error(`No configuration found for model: ${modelId}`);
    }

    switch (config.provider) {
      case 'google':
        return new GeminiModel(modelId, config);
      case 'anthropic':
        return new ClaudeModel(modelId, config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Update model configuration
   */
  public static updateConfig(newConfig: Partial<Record<AIModelId, ModelConfiguration>>): void {
    this.config = { ...this.config, ...newConfig };
    // Clear instances to force recreation with new config
    this.instances.clear();
  }

  /**
   * Check availability of all configured models
   */
  public static async checkAllModelsAvailability(): Promise<Record<AIModelId, boolean>> {
    const results: Record<AIModelId, boolean> = {} as Record<AIModelId, boolean>;
    
    const modelIds = Object.keys(this.config) as AIModelId[];
    
    await Promise.all(
      modelIds.map(async (modelId) => {
        try {
          const model = this.getModel(modelId);
          results[modelId] = await model.isAvailable();
        } catch (error) {
          console.warn(`Failed to check availability for ${modelId}:`, error);
          results[modelId] = false;
        }
      })
    );

    return results;
  }

  /**
   * Get all available model IDs
   */
  public static getAvailableModelIds(): AIModelId[] {
    return Object.keys(this.config) as AIModelId[];
  }

  /**
   * Clear all cached model instances
   */
  public static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get current configuration
   */
  public static getConfig(): Record<AIModelId, ModelConfiguration> {
    return { ...this.config };
  }
}