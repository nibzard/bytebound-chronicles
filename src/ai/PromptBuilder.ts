// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Prompt Builder using Handlebars templating engine
 * Manages prompt templates and context injection for AI models
 */

import Handlebars from 'handlebars';
import fs from 'node:fs';
import path from 'node:path';
import { GameContext } from '@/types/index.js';
import { AIActionResponseSchema, IntentDetectionSchema } from '@/schemas/index.js';
import { z } from 'zod';
import { registerHelpers } from './prompts/helpers.js';

type TemplateName = 'narrative_generation' | 'intent_detection';

export class PromptBuilder {
  private compiledTemplates: Map<TemplateName, Handlebars.TemplateDelegate> = new Map();
  private templatesDir = path.resolve(process.cwd(), 'src/ai/prompts/templates');

  constructor() {
    registerHelpers();
  }

  private getTemplate(name: TemplateName): Handlebars.TemplateDelegate {
    if (this.compiledTemplates.has(name)) {
      const template = this.compiledTemplates.get(name);
    if (!template) {
      throw new Error(`Compiled template not found: ${name}`);
    }
    return template;
    }

    const templatePath = path.join(this.templatesDir, `${name}.hbs`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiled = Handlebars.compile(templateSource);
    
    this.compiledTemplates.set(name, compiled);
    return compiled;
  }

  public buildNarrativePrompt(context: GameContext, userInput: string): string {
    const template = this.getTemplate('narrative_generation');

    // Prepare a flattened, template-friendly context object
    const templateContext = {
      ...context,
      userInput,
      activeObjectives: context.currentBeat.objectives.filter(
        o => !context.gameState.completedObjectives.includes(o.id)
      ),
      story: { 
        title: "Bytebound Chronicles" // TODO: Get from story metadata
      },
      jsonSchema: this.getJsonSchema(AIActionResponseSchema),
    };

    return template(templateContext);
  }

  public buildIntentDetectionPrompt(context: GameContext, userInput: string): string {
    const template = this.getTemplate('intent_detection');

    const templateContext = {
      ...context,
      userInput,
      jsonSchema: this.getJsonSchema(IntentDetectionSchema),
    };

    return template(templateContext);
  }

  public build(templateName: TemplateName, context: GameContext, userInput: string): string {
    switch (templateName) {
      case 'narrative_generation':
        return this.buildNarrativePrompt(context, userInput);
      case 'intent_detection':
        return this.buildIntentDetectionPrompt(context, userInput);
      default:
        throw new Error(`Unknown template: ${templateName}`);
    }
  }

  private getJsonSchema(_schema: z.ZodSchema): object {
    // Convert Zod schema to JSON schema
    // This is a simplified version - in production you might want to use a proper converter
    return {
      type: "object",
      description: "Response must be valid JSON matching the expected format"
    };
  }

  /**
   * Clear compiled template cache (useful for development/testing)
   */
  public clearCache(): void {
    this.compiledTemplates.clear();
  }

  /**
   * Precompile all templates (useful for production)
   */
  public async precompileTemplates(): Promise<void> {
    const templates: TemplateName[] = ['narrative_generation', 'intent_detection'];
    
    for (const templateName of templates) {
      try {
        this.getTemplate(templateName);
      } catch (error) {
        console.warn(`Failed to precompile template ${templateName}:`, error);
      }
    }
  }
}