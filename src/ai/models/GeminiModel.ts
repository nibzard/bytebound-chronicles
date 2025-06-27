// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Google Gemini AI Model implementation
 * Handles communication with Google's Generative AI API
 */

import { BaseModel, GenerationOptions } from './BaseModel.js';
import { AIModelId, ModelConfiguration } from '@/types/ai.js';
import { AIResponse } from '@/schemas/ai.js';

export class GeminiModel extends BaseModel {
  private apiEndpoint: string;

  constructor(modelId: AIModelId, config: ModelConfiguration) {
    super(modelId, config);
    this.validateConfig();
    this.apiEndpoint = config.endpoint ?? 'https://generativelanguage.googleapis.com/v1beta';
  }

  public async generate(prompt: string, options: GenerationOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: options.temperature ?? this.config.temperature,
          maxOutputTokens: options.maxTokens ?? this.config.maxTokens,
          ...(options.isJsonOutput && { responseMimeType: 'application/json' })
        }
      };

      const response = await fetch(
        `${this.apiEndpoint}/models/${this.config.actualModelId}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout((options.timeout ?? this.config.timeout) * 1000)
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
      };
      const processingTime = Date.now() - startTime;

      // Extract content from Gemini response format
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      
      if (!content) {
        throw new Error('Empty response from Gemini API');
      }

      // Estimate token usage (Gemini doesn't always provide exact counts)
      const estimatedTokens = Math.ceil(content.length / 4); // Rough estimate
      const cost = this.calculateCost(Math.ceil(prompt.length / 4), estimatedTokens);

      return {
        content,
        metadata: {
          modelUsed: this.config.actualModelId,
          tokensUsed: estimatedTokens,
          processingTime,
          cost,
          confidence: data.candidates?.[0]?.finishReason === 'STOP' ? 0.9 : 0.7,
        }
      };

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini model generation failed: ${error.message}`);
      }
      throw new Error('Unknown error in Gemini model generation');
    }
  }

  public override async isAvailable(): Promise<boolean> {
    try {
      // Simple availability check with a minimal request
      const response = await fetch(
        `${this.apiEndpoint}/models/${this.config.actualModelId}?key=${this.config.apiKey}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  protected override validateConfig(): void {
    super.validateConfig();
    
    if (this.config.provider !== 'google') {
      throw new Error(`Invalid provider for GeminiModel: ${this.config.provider}`);
    }
  }
}