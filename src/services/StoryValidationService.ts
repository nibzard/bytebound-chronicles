// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Story Validation Service
 * Comprehensive validation system for story files using the universal schema
 * Provides detailed error reporting, consistency checks, and quality assurance
 */

import { validateByteboundGame, type ByteboundGame } from '../validation/game-schema-validator.js';
import { StoryMetadataService } from './StoryMetadataService.js';
import { HybridDatabase } from '../database/HybridDatabase.js';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'structure' | 'content' | 'balance' | 'accessibility' | 'narrative';
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
  message: string;
  location: string;
  suggestions: string[];
  details?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  storyId: string;
  validatedAt: Date;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    criticalIssues: number;
  };
  metadata: {
    totalBeats: number;
    totalCharacters: number;
    totalItems: number;
    totalEndings: number;
    estimatedPlaytime: number;
    complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  };
  qualityScore: number; // 0-100
  recommendations: string[];
}

export interface ValidationConfig {
  metadataService: StoryMetadataService;
  database?: HybridDatabase;
  enableContentAnalysis: boolean;
  enableBalanceChecking: boolean;
  enableAccessibilityChecks: boolean;
  strictMode: boolean;
  customRules: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: ValidationIssue['category'];
  severity: ValidationIssue['severity'];
  check: (story: ByteboundGame) => ValidationIssue[];
}

export class StoryValidationService {
  private builtInRules: ValidationRule[] = [];

  constructor(private config: ValidationConfig) {
    this.initializeBuiltInRules();
  }

  /**
   * Validate a single story file comprehensively
   */
  async validateStory(storyId: string): Promise<ValidationResult> {
    try {
      // Load the full story
      const story = await this.config.metadataService.loadFullStory(storyId);
      if (!story) {
        return this.createErrorResult(storyId, 'Story not found');
      }

      return this.validateStoryContent(story);
    } catch (error) {
      return this.createErrorResult(storyId, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Validate story content directly
   */
  async validateStoryContent(story: ByteboundGame): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    // Run all validation rules
    const allRules = [...this.builtInRules, ...this.config.customRules];
    
    for (const rule of allRules) {
      try {
        const ruleIssues = rule.check(story);
        issues.push(...ruleIssues);
      } catch (error) {
        issues.push({
          type: 'error',
          category: 'structure',
          severity: 'high',
          code: 'RULE_EXECUTION_ERROR',
          message: `Validation rule '${rule.name}' failed to execute: ${error}`,
          location: 'validation_system',
          suggestions: ['Contact system administrator']
        });
      }
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(issues);
    
    // Calculate metadata
    const metadata = this.calculateMetadata(story);
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(issues, metadata);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, story);

    const result: ValidationResult = {
      valid: summary.errors === 0 && summary.criticalIssues === 0,
      storyId: story.metadata.id,
      validatedAt: new Date(),
      issues,
      summary,
      metadata,
      qualityScore,
      recommendations
    };

    // Store validation result in database if available
    if (this.config.database) {
      await this.storeValidationResult(result);
    }

    return result;
  }

  /**
   * Validate multiple stories in batch
   */
  async validateMultipleStories(storyIds: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const storyId of storyIds) {
      try {
        const result = await this.validateStory(storyId);
        results.push(result);
      } catch (error) {
        results.push(this.createErrorResult(storyId, `Validation failed: ${error}`));
      }
    }
    
    return results;
  }

  /**
   * Get validation history for a story
   */
  async getValidationHistory(storyId: string, limit = 10): Promise<ValidationResult[]> {
    if (!this.config.database) {
      return [];
    }

    // This would be implemented when we have the database schema for validation history
    return [];
  }

  /**
   * Add custom validation rule
   */
  addCustomRule(rule: ValidationRule): void {
    this.config.customRules.push(rule);
  }

  /**
   * Remove custom validation rule
   */
  removeCustomRule(ruleId: string): void {
    this.config.customRules = this.config.customRules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Get all available validation rules
   */
  getAvailableRules(): ValidationRule[] {
    return [...this.builtInRules, ...this.config.customRules];
  }

  /**
   * Private helper methods
   */

  private initializeBuiltInRules(): void {
    this.builtInRules = [
      // Structural validation rules
      {
        id: 'REQUIRED_METADATA',
        name: 'Required Metadata Fields',
        description: 'Ensures all required metadata fields are present and valid',
        category: 'structure',
        severity: 'critical',
        check: (story: ByteboundGame) => this.checkRequiredMetadata(story)
      },
      {
        id: 'BEAT_CONNECTIVITY',
        name: 'Story Beat Connectivity',
        description: 'Validates that all story beats are properly connected',
        category: 'structure',
        severity: 'high',
        check: (story: ByteboundGame) => this.checkBeatConnectivity(story)
      },
      {
        id: 'REFERENCE_INTEGRITY',
        name: 'Reference Integrity',
        description: 'Ensures all character, item, and beat references are valid',
        category: 'structure',
        severity: 'high',
        check: (story: ByteboundGame) => this.checkReferenceIntegrity(story)
      },

      // Content validation rules
      {
        id: 'NARRATIVE_QUALITY',
        name: 'Narrative Quality',
        description: 'Analyzes narrative text quality and consistency',
        category: 'content',
        severity: 'medium',
        check: (story: ByteboundGame) => this.config.enableContentAnalysis ? this.checkNarrativeQuality(story) : []
      },
      {
        id: 'CHARACTER_DEVELOPMENT',
        name: 'Character Development',
        description: 'Validates character consistency and development',
        category: 'content',
        severity: 'medium',
        check: (story: ByteboundGame) => this.config.enableContentAnalysis ? this.checkCharacterDevelopment(story) : []
      },

      // Balance validation rules
      {
        id: 'PROGRESSION_BALANCE',
        name: 'Progression Balance',
        description: 'Checks game progression and difficulty balance',
        category: 'balance',
        severity: 'medium',
        check: (story: ByteboundGame) => this.config.enableBalanceChecking ? this.checkProgressionBalance(story) : []
      },
      {
        id: 'CHOICE_DIVERSITY',
        name: 'Player Choice Diversity',
        description: 'Ensures adequate player choice options',
        category: 'balance',
        severity: 'low',
        check: (story: ByteboundGame) => this.config.enableBalanceChecking ? this.checkChoiceDiversity(story) : []
      },

      // Accessibility rules
      {
        id: 'CONTENT_WARNINGS',
        name: 'Content Warning Coverage',
        description: 'Validates appropriate content warnings are provided',
        category: 'accessibility',
        severity: 'medium',
        check: (story: ByteboundGame) => this.config.enableAccessibilityChecks ? this.checkContentWarnings(story) : []
      },
      {
        id: 'DIFFICULTY_ACCESSIBILITY',
        name: 'Difficulty Accessibility',
        description: 'Ensures story is accessible to indicated difficulty level',
        category: 'accessibility',
        severity: 'low',
        check: (story: ByteboundGame) => this.config.enableAccessibilityChecks ? this.checkDifficultyAccessibility(story) : []
      }
    ];
  }

  private checkRequiredMetadata(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const metadata = story.metadata;

    if (!metadata.title || metadata.title.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'structure',
        severity: 'critical',
        code: 'MISSING_TITLE',
        message: 'Story title is required and cannot be empty',
        location: 'metadata.title',
        suggestions: ['Provide a descriptive title for your story']
      });
    }

    if (!metadata.description || metadata.description.trim().length < 10) {
      issues.push({
        type: 'warning',
        category: 'content',
        severity: 'medium',
        code: 'INSUFFICIENT_DESCRIPTION',
        message: 'Story description should be at least 10 characters long',
        location: 'metadata.description',
        suggestions: ['Provide a more detailed description of your story']
      });
    }

    if (!metadata.gameStyle) {
      issues.push({
        type: 'error',
        category: 'structure',
        severity: 'critical',
        code: 'MISSING_GAME_STYLE',
        message: 'Game style is required',
        location: 'metadata.gameStyle',
        suggestions: ['Specify a game style (rpg-fantasy, horror, heist, etc.)']
      });
    }

    if (!metadata.estimatedLength || metadata.estimatedLength <= 0) {
      issues.push({
        type: 'warning',
        category: 'content',
        severity: 'low',
        code: 'INVALID_ESTIMATED_LENGTH',
        message: 'Estimated length should be a positive number',
        location: 'metadata.estimatedLength',
        suggestions: ['Provide an estimated play time in minutes']
      });
    }

    return issues;
  }

  private checkBeatConnectivity(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const beats = story.beats;

    if (beats.length === 0) {
      issues.push({
        type: 'error',
        category: 'structure',
        severity: 'critical',
        code: 'NO_STORY_BEATS',
        message: 'Story must have at least one beat',
        location: 'beats',
        suggestions: ['Add story beats to create your narrative']
      });
      return issues;
    }

    // Check for unreachable beats
    const reachableBeats = new Set<string>();
    const beatIds = new Set(beats.map(b => b.id));
    
    // Start with the first beat (assumed to be starting beat)
    const startingBeat = beats.sort((a, b) => a.act - b.act)[0];
    reachableBeats.add(startingBeat.id);

    // Find all reachable beats through exit conditions
    let changed = true;
    while (changed) {
      changed = false;
      for (const beat of beats) {
        if (!reachableBeats.has(beat.id)) continue;
        
        for (const exitCondition of beat.exitConditions || []) {
          if (beatIds.has(exitCondition.nextBeat) && !reachableBeats.has(exitCondition.nextBeat)) {
            reachableBeats.add(exitCondition.nextBeat);
            changed = true;
          }
        }
      }
    }

    // Report unreachable beats
    for (const beat of beats) {
      if (!reachableBeats.has(beat.id) && beat.id !== startingBeat.id) {
        issues.push({
          type: 'warning',
          category: 'structure',
          severity: 'medium',
          code: 'UNREACHABLE_BEAT',
          message: `Beat '${beat.id}' is not reachable from the starting beat`,
          location: `beats[${beat.id}]`,
          suggestions: ['Add exit conditions from other beats to reach this beat', 'Consider removing if intentionally unreachable']
        });
      }
    }

    // Check for beats with no exit conditions (potential dead ends)
    for (const beat of beats) {
      if (!beat.exitConditions || beat.exitConditions.length === 0) {
        const hasEndings = story.endings && story.endings.length > 0;
        if (!hasEndings) {
          issues.push({
            type: 'warning',
            category: 'structure',
            severity: 'medium',
            code: 'DEAD_END_BEAT',
            message: `Beat '${beat.id}' has no exit conditions and no story endings defined`,
            location: `beats[${beat.id}].exitConditions`,
            suggestions: ['Add exit conditions to continue the story', 'Define story endings if this is an end beat']
          });
        }
      }
    }

    return issues;
  }

  private checkReferenceIntegrity(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const characterIds = new Set((story.characters || []).map(c => c.id));
    const itemIds = new Set((story.items || []).map(i => i.id));
    const beatIds = new Set(story.beats.map(b => b.id));

    // Check character references in beats
    for (const beat of story.beats) {
      // Check quick actions for character/item references
      for (const action of beat.quickActions || []) {
        if (action.effects?.addsItem && !itemIds.has(action.effects.addsItem)) {
          issues.push({
            type: 'error',
            category: 'structure',
            severity: 'high',
            code: 'INVALID_ITEM_REFERENCE',
            message: `Beat '${beat.id}' references non-existent item '${action.effects.addsItem}'`,
            location: `beats[${beat.id}].quickActions[${action.id}].effects.addsItem`,
            suggestions: ['Create the referenced item', 'Remove the invalid reference']
          });
        }
      }

      // Check exit conditions for beat references
      for (const exitCondition of beat.exitConditions || []) {
        if (!beatIds.has(exitCondition.nextBeat)) {
          issues.push({
            type: 'error',
            category: 'structure',
            severity: 'high',
            code: 'INVALID_BEAT_REFERENCE',
            message: `Beat '${beat.id}' has exit condition referencing non-existent beat '${exitCondition.nextBeat}'`,
            location: `beats[${beat.id}].exitConditions`,
            suggestions: ['Create the referenced beat', 'Update the reference to an existing beat']
          });
        }
      }
    }

    return issues;
  }

  private checkNarrativeQuality(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for empty or very short narrative content
    for (const beat of story.beats) {
      if (!beat.narrativeGuidance?.openingText || beat.narrativeGuidance.openingText.trim().length < 20) {
        issues.push({
          type: 'warning',
          category: 'content',
          severity: 'medium',
          code: 'INSUFFICIENT_NARRATIVE',
          message: `Beat '${beat.id}' has insufficient narrative content`,
          location: `beats[${beat.id}].narrativeGuidance.openingText`,
          suggestions: ['Expand the narrative to provide better context and immersion']
        });
      }

      // Check for placeholder text
      const placeholderPatterns = /lorem ipsum|placeholder|todo|fix me|temp/i;
      if (beat.narrativeGuidance?.openingText && placeholderPatterns.test(beat.narrativeGuidance.openingText)) {
        issues.push({
          type: 'warning',
          category: 'content',
          severity: 'high',
          code: 'PLACEHOLDER_CONTENT',
          message: `Beat '${beat.id}' contains placeholder text`,
          location: `beats[${beat.id}].narrativeGuidance.openingText`,
          suggestions: ['Replace placeholder text with actual narrative content']
        });
      }
    }

    return issues;
  }

  private checkCharacterDevelopment(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!story.characters || story.characters.length === 0) {
      issues.push({
        type: 'info',
        category: 'content',
        severity: 'low',
        code: 'NO_CHARACTERS',
        message: 'Story has no defined characters',
        location: 'characters',
        suggestions: ['Consider adding characters to enhance narrative depth']
      });
      return issues;
    }

    for (const character of story.characters) {
      if (!character.description || character.description.trim().length < 10) {
        issues.push({
          type: 'warning',
          category: 'content',
          severity: 'low',
          code: 'INSUFFICIENT_CHARACTER_DESCRIPTION',
          message: `Character '${character.id}' has insufficient description`,
          location: `characters[${character.id}].description`,
          suggestions: ['Provide a more detailed character description']
        });
      }

      if (!character.personality || character.personality.length === 0) {
        issues.push({
          type: 'warning',
          category: 'content',
          severity: 'low',
          code: 'NO_CHARACTER_PERSONALITY',
          message: `Character '${character.id}' has no defined personality traits`,
          location: `characters[${character.id}].personality`,
          suggestions: ['Add personality traits to make the character more interesting']
        });
      }
    }

    return issues;
  }

  private checkProgressionBalance(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.config.enableBalanceChecking) {
      return issues;
    }

    // Check hidden mechanics balance
    const mechanics = story.hiddenMechanics;
    if (mechanics.playerStats && Object.keys(mechanics.playerStats).length === 0) {
      issues.push({
        type: 'warning',
        category: 'balance',
        severity: 'medium',
        code: 'NO_PLAYER_STATS',
        message: 'Story has no player statistics defined',
        location: 'hiddenMechanics.playerStats',
        suggestions: ['Define player statistics to enable progression tracking']
      });
    }

    // Check if thresholds are reasonable
    if (mechanics.thresholds) {
      for (const [stat, threshold] of Object.entries(mechanics.thresholds)) {
        const initialValue = mechanics.playerStats[stat] || 0;
        // Check if threshold exists in playerStats or if there's no way to reach it
        if (typeof threshold === 'number' && !(stat in mechanics.playerStats)) {
          issues.push({
            type: 'warning',
            category: 'balance',
            severity: 'medium',
            code: 'UNREACHABLE_THRESHOLD',
            message: `Threshold '${stat}' (${threshold}) references non-existent player stat`,
            location: `hiddenMechanics.thresholds.${stat}`,
            suggestions: ['Add the stat to playerStats or remove the threshold']
          });
        } else if (typeof threshold === 'number' && threshold <= initialValue) {
          issues.push({
            type: 'warning',
            category: 'balance',
            severity: 'medium',
            code: 'UNREACHABLE_THRESHOLD',
            message: `Threshold '${stat}' (${threshold}) is not greater than initial value (${initialValue})`,
            location: `hiddenMechanics.thresholds.${stat}`,
            suggestions: ['Increase threshold value or provide ways to increase the stat']
          });
        }
      }
    }

    return issues;
  }

  private checkChoiceDiversity(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const beat of story.beats) {
      const actionCount = (beat.quickActions || []).length;
      
      if (actionCount === 0) {
        issues.push({
          type: 'warning',
          category: 'balance',
          severity: 'low',
          code: 'NO_PLAYER_CHOICES',
          message: `Beat '${beat.id}' provides no player choice options`,
          location: `beats[${beat.id}].quickActions`,
          suggestions: ['Add quick actions to give players meaningful choices']
        });
      } else if (actionCount === 1) {
        issues.push({
          type: 'info',
          category: 'balance',
          severity: 'low',
          code: 'LIMITED_PLAYER_CHOICES',
          message: `Beat '${beat.id}' provides only one choice option`,
          location: `beats[${beat.id}].quickActions`,
          suggestions: ['Consider adding more choice options for better player agency']
        });
      }
    }

    return issues;
  }

  private checkContentWarnings(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!this.config.enableAccessibilityChecks) {
      return issues;
    }

    // Check for potentially sensitive content without warnings
    const sensitiveKeywords = ['violence', 'death', 'blood', 'kill', 'murder', 'horror', 'dark', 'disturbing'];
    let hasSensitiveContent = false;

    for (const beat of story.beats) {
      const content = beat.narrativeGuidance?.openingText?.toLowerCase() || '';
      if (sensitiveKeywords.some(keyword => content.includes(keyword))) {
        hasSensitiveContent = true;
        break;
      }
    }

    if (hasSensitiveContent && (!story.metadata.contentWarnings || story.metadata.contentWarnings.length === 0)) {
      issues.push({
        type: 'warning',
        category: 'accessibility',
        severity: 'medium',
        code: 'MISSING_CONTENT_WARNINGS',
        message: 'Story contains potentially sensitive content but has no content warnings',
        location: 'metadata.contentWarnings',
        suggestions: ['Add appropriate content warnings for sensitive material']
      });
    }

    return issues;
  }

  private checkDifficultyAccessibility(story: ByteboundGame): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    const difficulty = story.metadata.difficulty;
    const beatCount = story.beats.length;
    const averageChoices = story.beats.reduce((sum, beat) => sum + (beat.quickActions?.length || 0), 0) / beatCount;

    // Check if complexity matches stated difficulty
    if (difficulty === 'easy' && beatCount > 10) {
      issues.push({
        type: 'info',
        category: 'accessibility',
        severity: 'low',
        code: 'COMPLEXITY_DIFFICULTY_MISMATCH',
        message: 'Story marked as "easy" but has many beats, consider if complexity matches difficulty',
        location: 'metadata.difficulty',
        suggestions: ['Review if the stated difficulty matches the actual complexity']
      });
    }

    if (difficulty === 'hard' && averageChoices < 2) {
      issues.push({
        type: 'info',
        category: 'accessibility',
        severity: 'low',
        code: 'SIMPLE_CHOICES_HARD_DIFFICULTY',
        message: 'Story marked as "hard" but has simple choice structure',
        location: 'metadata.difficulty',
        suggestions: ['Consider adding more complex choice mechanics for hard difficulty']
      });
    }

    return issues;
  }

  private calculateSummary(issues: ValidationIssue[]) {
    return {
      errors: issues.filter(i => i.type === 'error').length,
      warnings: issues.filter(i => i.type === 'warning').length,
      infos: issues.filter(i => i.type === 'info').length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length
    };
  }

  private calculateMetadata(story: ByteboundGame) {
    const beatCount = story.beats.length;
    const characterCount = (story.characters || []).length;
    const itemCount = (story.items || []).length;
    const endingCount = (story.endings || []).length;
    
    // Estimate complexity based on various factors
    let complexityScore = 0;
    complexityScore += beatCount * 2;
    complexityScore += characterCount * 3;
    complexityScore += itemCount * 1;
    complexityScore += endingCount * 4;
    
    const avgChoicesPerBeat = story.beats.reduce((sum, beat) => sum + (beat.quickActions?.length || 0), 0) / beatCount;
    complexityScore += avgChoicesPerBeat * 5;

    let complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
    if (complexityScore <= 20) complexity = 'simple';
    else if (complexityScore <= 50) complexity = 'moderate';
    else if (complexityScore <= 100) complexity = 'complex';
    else complexity = 'very_complex';

    return {
      totalBeats: beatCount,
      totalCharacters: characterCount,
      totalItems: itemCount,
      totalEndings: endingCount,
      estimatedPlaytime: story.metadata.estimatedLength || 0,
      complexity
    };
  }

  private calculateQualityScore(issues: ValidationIssue[], metadata: any): number {
    let score = 100;

    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    }

    // Bonus points for good practices
    if (metadata.totalCharacters > 0) score += 5;
    if (metadata.totalItems > 0) score += 3;
    if (metadata.totalEndings > 1) score += 5;
    if (metadata.complexity === 'moderate' || metadata.complexity === 'complex') score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(issues: ValidationIssue[], story: ByteboundGame): string[] {
    const recommendations: string[] = [];
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical issues before publishing the story');
    }

    const errorCount = issues.filter(i => i.type === 'error').length;
    if (errorCount > 0) {
      recommendations.push('Fix structural errors to ensure story functionality');
    }

    if (story.beats.length < 3) {
      recommendations.push('Consider adding more story beats for better narrative depth');
    }

    if (!story.characters || story.characters.length === 0) {
      recommendations.push('Add characters to make the story more engaging');
    }

    if (!story.endings || story.endings.length < 2) {
      recommendations.push('Provide multiple endings to increase replayability');
    }

    return recommendations;
  }

  private createErrorResult(storyId: string, errorMessage: string): ValidationResult {
    return {
      valid: false,
      storyId,
      validatedAt: new Date(),
      issues: [{
        type: 'error',
        category: 'structure',
        severity: 'critical',
        code: 'VALIDATION_FAILED',
        message: errorMessage,
        location: 'story',
        suggestions: ['Check story file format and accessibility']
      }],
      summary: { errors: 1, warnings: 0, infos: 0, criticalIssues: 1 },
      metadata: {
        totalBeats: 0,
        totalCharacters: 0,
        totalItems: 0,
        totalEndings: 0,
        estimatedPlaytime: 0,
        complexity: 'simple'
      },
      qualityScore: 0,
      recommendations: ['Fix validation errors before proceeding']
    };
  }

  private async storeValidationResult(result: ValidationResult): Promise<void> {
    // This would store the validation result in the database
    // Implementation depends on database schema
    if (this.config.database) {
      // Store validation result for future reference
      console.log(`Storing validation result for story ${result.storyId}`);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      totalRules: this.builtInRules.length + this.config.customRules.length,
      builtInRules: this.builtInRules.length,
      customRules: this.config.customRules.length,
      enabledFeatures: {
        contentAnalysis: this.config.enableContentAnalysis,
        balanceChecking: this.config.enableBalanceChecking,
        accessibilityChecks: this.config.enableAccessibilityChecks,
        strictMode: this.config.strictMode
      }
    };
  }
}