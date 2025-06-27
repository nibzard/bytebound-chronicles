// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Base AI Model abstract class
 * Defines the interface for all AI model implementations
 */

import { AIModelId, ModelConfiguration } from '@/types/ai.js';
import { AIResponse } from '@/schemas/ai.js';

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  isJsonOutput?: boolean;
}

export abstract class BaseModel {
  protected modelId: AIModelId;
  protected config: ModelConfiguration;

  constructor(modelId: AIModelId, config: ModelConfiguration) {
    this.modelId = modelId;
    this.config = config;
  }

  /**
   * Generate a response from the AI model
   */
  public abstract generate(prompt: string, options?: GenerationOptions): Promise<AIResponse>;

  /**
   * Check if the model is available and configured
   */
  public abstract isAvailable(): Promise<boolean>;

  /**
   * Get model capabilities
   */
  public getCapabilities() {
    return this.config.capabilities;
  }

  /**
   * Get model configuration
   */
  public getConfig() {
    return this.config;
  }

  /**
   * Get the actual model ID (e.g., 'gemini-2.5-pro')
   */
  public getActualModelId() {
    return this.config.actualModelId;
  }

  /**
   * Get the role-based model ID (e.g., 'PRIMARY_NARRATIVE')
   */
  public getModelId() {
    return this.modelId;
  }

  /**
   * Calculate estimated cost for a request
   */
  protected calculateCost(promptTokens: number, responseTokens: number): number {
    const totalTokens = promptTokens + responseTokens;
    return totalTokens * this.config.costPerToken;
  }

  /**
   * Validate that required configuration is present
   */
  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`API key not configured for model ${this.modelId}`);
    }
    if (!this.config.actualModelId) {
      throw new Error(`Actual model ID not configured for ${this.modelId}`);
    }
  }
}