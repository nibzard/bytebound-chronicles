// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Frustration Detection System
 * Analyzes player behavior and text patterns to detect frustration levels
 */

import { 
  FrustrationAnalysis, 
  FrustrationIndicator, 
  FrustrationPattern,
  FrustrationRecommendation,
  PlayerProfile,
  PlayerInteraction 
} from '@/types/ai.js';

export class FrustrationDetector {
  private frustrationPatterns: Map<string, RegExp> = new Map([
    ['explicit_frustration', /\b(frustrated?|annoyed?|angry|mad|stupid|dumb|hate|sucks?)\b/i],
    ['repeated_attempts', /\b(again|try again|once more|repeat)\b/i],
    ['help_seeking', /\b(help|stuck|don't know|confused|lost)\b/i],
    ['negative_sentiment', /\b(no|not|never|can't|won't|impossible|useless)\b/i],
    ['urgency', /\b(hurry|quick|fast|now|immediately)\b/i],
  ]);

  private behaviorThresholds = {
    rapidInputs: 3, // inputs within 30 seconds
    shortInputs: 5,  // consecutive inputs under 10 characters
    repetitiveInputs: 3, // same/similar inputs
    longPauses: 180, // seconds of inactivity
  };

  /**
   * Analyze player frustration based on recent interactions and profile
   */
  public analyzeFrustration(
    recentInteractions: PlayerInteraction[],
    playerProfile: PlayerProfile
  ): FrustrationAnalysis {
    const indicators = this.detectIndicators(recentInteractions);
    const patterns = this.identifyPatterns(recentInteractions);
    const recommendations = this.generateRecommendations(indicators, patterns, playerProfile);
    
    const score = this.calculateFrustrationScore(indicators, patterns, playerProfile);
    const confidence = this.calculateConfidence(indicators.length, recentInteractions.length);

    return {
      score,
      indicators,
      patterns,
      recommendations,
      confidence,
    };
  }

  /**
   * Detect frustration indicators from text and behavior patterns
   */
  private detectIndicators(interactions: PlayerInteraction[]): FrustrationIndicator[] {
    const indicators: FrustrationIndicator[] = [];

    // Text pattern analysis
    for (const interaction of interactions.slice(-10)) { // Last 10 interactions
      for (const [patternName, regex] of this.frustrationPatterns) {
        if (regex.test(interaction.input)) {
          indicators.push({
            type: 'text_pattern',
            description: `Detected ${patternName} in player input`,
            weight: this.getPatternWeight(patternName),
            evidence: [interaction.input],
          });
        }
      }
    }

    // Behavior pattern analysis
    indicators.push(...this.detectBehaviorPatterns(interactions));

    // Timing pattern analysis
    indicators.push(...this.detectTimingPatterns(interactions));

    // Repetition pattern analysis
    indicators.push(...this.detectRepetitionPatterns(interactions));

    return indicators;
  }

  private detectBehaviorPatterns(interactions: PlayerInteraction[]): FrustrationIndicator[] {
    const indicators: FrustrationIndicator[] = [];
    
    if (interactions.length < 3) return indicators;

    // Check for very short inputs
    const shortInputs = interactions.slice(-5).filter(i => i.input.trim().length < 10);
    if (shortInputs.length >= this.behaviorThresholds.shortInputs) {
      indicators.push({
        type: 'behavior_pattern',
        description: 'Multiple consecutive short inputs detected',
        weight: 0.6,
        evidence: shortInputs.map(i => i.input),
      });
    }

    return indicators;
  }

  private detectTimingPatterns(interactions: PlayerInteraction[]): FrustrationIndicator[] {
    const indicators: FrustrationIndicator[] = [];
    
    if (interactions.length < 3) return indicators;

    // Check for rapid inputs
    const recent = interactions.slice(-this.behaviorThresholds.rapidInputs);
    if (recent.length >= this.behaviorThresholds.rapidInputs) {
      const lastTimestamp = recent[recent.length - 1]?.timestamp;
      const firstTimestamp = recent[0]?.timestamp;
      if (lastTimestamp === undefined || firstTimestamp === undefined) return indicators;
      const timeSpan = lastTimestamp - firstTimestamp;
      if (timeSpan < 30000) { // 30 seconds
        indicators.push({
          type: 'timing_pattern',
          description: 'Rapid successive inputs detected',
          weight: 0.7,
          evidence: recent.map(i => `"${i.input}" at ${new Date(i.timestamp).toISOString()}`),
        });
      }
    }

    return indicators;
  }

  private detectRepetitionPatterns(interactions: PlayerInteraction[]): FrustrationIndicator[] {
    const indicators: FrustrationIndicator[] = [];
    
    if (interactions.length < 3) return indicators;

    // Check for repeated similar inputs
    const recent = interactions.slice(-5);
    const inputCounts = new Map<string, number>();
    
    for (const interaction of recent) {
      const normalized = interaction.input.toLowerCase().trim();
      inputCounts.set(normalized, (inputCounts.get(normalized) ?? 0) + 1);
    }

    for (const [input, count] of inputCounts) {
      if (count >= this.behaviorThresholds.repetitiveInputs) {
        indicators.push({
          type: 'repetition_pattern',
          description: 'Repeated similar inputs detected',
          weight: 0.8,
          evidence: [input],
        });
      }
    }

    return indicators;
  }

  private identifyPatterns(interactions: PlayerInteraction[]): FrustrationPattern[] {
    const patterns: FrustrationPattern[] = [];

    if (interactions.length < 5) return patterns;

    // Analyze trends over time
    const windowSize = Math.min(10, interactions.length);
    const recent = interactions.slice(-windowSize);
    
    // Calculate frustration indicators per time window
    const windowScores = this.calculateWindowScores(recent, 5);
    
    if (windowScores.length >= 2) {
      const trend = this.determineTrend(windowScores);
      
      patterns.push({
        name: 'frustration_trend',
        frequency: windowScores.reduce((sum, score) => sum + score, 0) / windowScores.length,
        severity: Math.max(...windowScores),
        trend,
        timeframe: windowSize * 2, // Approximate minutes
      });
    }

    return patterns;
  }

  private calculateWindowScores(interactions: PlayerInteraction[], windowSize: number): number[] {
    const scores: number[] = [];
    
    for (let i = 0; i <= interactions.length - windowSize; i += windowSize) {
      const window = interactions.slice(i, i + windowSize);
      const indicators = this.detectIndicators(window);
      const score = indicators.reduce((sum, indicator) => sum + indicator.weight, 0) / windowSize;
      scores.push(Math.min(score, 1)); // Cap at 1.0
    }
    
    return scores;
  }

  private determineTrend(scores: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (scores.length < 2) return 'stable';
    
    const last = scores[scores.length - 1];
    const previous = scores[scores.length - 2];
    if (last === undefined || previous === undefined) return 'stable';
    const diff = last - previous;
    
    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }

  private generateRecommendations(
    indicators: FrustrationIndicator[],
    patterns: FrustrationPattern[],
    playerProfile: PlayerProfile
  ): FrustrationRecommendation[] {
    const recommendations: FrustrationRecommendation[] = [];
    
    const frustrationScore = this.calculateFrustrationScore(indicators, patterns, playerProfile);
    
    if (frustrationScore > 0.7) {
      recommendations.push({
        action: 'escalate',
        priority: 0.9,
        reasoning: 'High frustration detected, escalate to empathetic AI model',
        expectedEffectiveness: 0.8,
      });
    } else if (frustrationScore > 0.5) {
      recommendations.push({
        action: 'provide_hint',
        priority: 0.7,
        reasoning: 'Moderate frustration, provide contextual hint',
        expectedEffectiveness: 0.6,
      });
    }
    
    // Check for help-seeking behavior
    const helpSeeking = indicators.some(i => 
      i.type === 'text_pattern' && i.description.includes('help_seeking')
    );
    
    if (helpSeeking) {
      recommendations.push({
        action: 'offer_help',
        priority: 0.8,
        reasoning: 'Player explicitly seeking help',
        expectedEffectiveness: 0.7,
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private calculateFrustrationScore(
    indicators: FrustrationIndicator[],
    patterns: FrustrationPattern[],
    playerProfile: PlayerProfile
  ): number {
    let score = 0;
    
    // Base score from indicators
    const indicatorScore = indicators.reduce((sum, indicator) => sum + indicator.weight, 0);
    score += Math.min(indicatorScore / 3, 0.7); // Cap indicator contribution
    
    // Pattern contribution
    const patternScore = patterns.reduce((sum, pattern) => sum + pattern.severity * 0.3, 0);
    score += Math.min(patternScore, 0.2);
    
    // Player profile adjustment
    if (playerProfile.frustrationLevel > 0.5) {
      score += 0.1; // Already frustrated players escalate faster
    }
    
    return Math.min(score, 1.0);
  }

  private calculateConfidence(indicatorCount: number, interactionCount: number): number {
    if (interactionCount < 3) return 0.3;
    if (indicatorCount === 0) return 0.5;
    
    // More indicators and interactions = higher confidence
    const base = Math.min(indicatorCount / 5, 0.6);
    const interaction_bonus = Math.min(interactionCount / 10, 0.3);
    
    return Math.min(base + interaction_bonus + 0.1, 0.9);
  }

  private getPatternWeight(patternName: string): number {
    const weights: Record<string, number> = {
      explicit_frustration: 0.9,
      help_seeking: 0.7,
      repeated_attempts: 0.6,
      negative_sentiment: 0.4,
      urgency: 0.3,
    };
    
    return weights[patternName] ?? 0.5;
  }
}