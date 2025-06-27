// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Anthropic Claude AI Model implementation
 * Handles communication with Anthropic's Claude API
 */

import { BaseModel, GenerationOptions } from './BaseModel.js';
import { AIModelId, ModelConfiguration } from '@/types/ai.js';
import { AIResponse } from '@/schemas/ai.js';

export class ClaudeModel extends BaseModel {
  private apiEndpoint: string;

  constructor(modelId: AIModelId, config: ModelConfiguration) {
    super(modelId, config);
    this.validateConfig();
    this.apiEndpoint = config.endpoint ?? 'https://api.anthropic.com/v1';
  }

  public async generate(prompt: string, options: GenerationOptions = {}): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const requestBody = {
        model: this.config.actualModelId,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        temperature: options.temperature ?? this.config.temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      };

      const response = await fetch(
        `${this.apiEndpoint}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout((options.timeout ?? this.config.timeout) * 1000)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as {
        content?: Array<{ text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
        stop_reason?: string;
      };
      const processingTime = Date.now() - startTime;

      // Extract content from Claude response format
      const content = data.content?.[0]?.text ?? '';
      
      if (!content) {
        throw new Error('Empty response from Claude API');
      }

      // Claude provides token usage in the response
      const inputTokens = data.usage?.input_tokens ?? Math.ceil(prompt.length / 4);
      const outputTokens = data.usage?.output_tokens ?? Math.ceil(content.length / 4);
      const cost = this.calculateCost(inputTokens, outputTokens);

      return {
        content,
        metadata: {
          modelUsed: this.config.actualModelId,
          tokensUsed: inputTokens + outputTokens,
          processingTime,
          cost,
          confidence: data.stop_reason === 'end_turn' ? 0.95 : 0.8,
        }
      };

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude model generation failed: ${error.message}`);
      }
      throw new Error('Unknown error in Claude model generation');
    }
  }

  public override async isAvailable(): Promise<boolean> {
    try {
      // Simple availability check with a minimal request
      const response = await fetch(
        `${this.apiEndpoint}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: this.config.actualModelId,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }]
          }),
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
    
    if (this.config.provider !== 'anthropic') {
      throw new Error(`Invalid provider for ClaudeModel: ${this.config.provider}`);
    }
  }
}