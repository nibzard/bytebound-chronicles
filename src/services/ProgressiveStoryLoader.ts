// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Progressive Story Loader Service
 * Loads story content progressively to prevent spoilers while maintaining game flow
 * Only reveals content that the player should have access to based on their progress
 */

import { ByteboundGame } from '../validation/game-schema-validator.js';
import { StoryMetadataService } from './StoryMetadataService.js';
import { HybridDatabase } from '../database/HybridDatabase.js';
import { StoryProgress } from '../types/game.js';

export interface ProgressiveStoryState {
  storyId: string;
  playerId: string;
  currentBeatId: string;
  accessibleBeats: string[];
  revealedCharacters: string[];
  discoveredItems: string[];
  unlockedEndings: string[];
  hiddenMechanicsState: Record<string, number>;
  relationshipsState: Record<string, number>;
  gameFlags: Record<string, boolean>;
  lastUpdated: Date;
}

export interface StoryBeatContent {
  id: string;
  act: number;
  title: string;
  description?: string;
  setting?: {
    location: string;
    timeOfDay: string;
    atmosphere: string;
  };
  entryRequirements?: Array<{
    type: string;
    condition: string;
    value?: any;
    operator?: string;
  }>;
  narrativeGuidance: {
    openingText: string;
    dynamicElements?: Record<string, string>;
    moodProgression?: string[];
  };
  quickActions: Array<{
    id: string;
    label: string;
    description: string;
    icon?: string;
    visible: boolean;
    requirements?: Array<{
      type: string;
      condition: string;
      value?: any;
      operator?: string;
    }>;
    effects?: {
      statChanges?: Record<string, number>;
      narrative?: string;
      progressStory?: boolean;
      addsItem?: string;
      triggersEvent?: string;
    };
  }>;
  objectives?: Array<{
    id: string;
    description: string;
    type: 'required' | 'optional';
    visible: boolean;
    completionHints?: string[];
    weight?: number;
    rewards?: {
      experience?: number;
      statBonus?: Record<string, number>;
    };
  }>;
  hiddenTriggers?: Array<{
    condition: {
      type: string;
      condition: string;
      value: any;
      operator: string;
    };
    effect: string;
    description: string;
    narrative: string;
  }>;
  exitConditions: Array<{
    requirements: Array<{
      type: string;
      condition: string;
      value?: any;
      operator?: string;
    }>;
    nextBeat: string;
    narrative?: string;
    automatic: boolean;
  }>;
}

export interface RevealedCharacter {
  id: string;
  name: string;
  description: string;
  personality: string[];
  role: string;
  stats?: Record<string, number>;
  knowledge?: string[];
  secrets?: string[];
  relationships?: Record<string, any>;
  companionAbilities?: Array<{
    id: string;
    name: string;
    description: string;
    type: 'active' | 'passive';
    cooldown?: string;
  }>;
  dialogueTrees?: Record<string, {
    text: string;
    playerOptions?: Array<{
      text: string;
      requirements?: Array<{
        type: string;
        condition: string;
        value: any;
        operator?: string;
      }>;
      effects?: {
        statChanges?: Record<string, number>;
        leadsTo?: string;
      };
    }>;
    reveals?: string[];
  }>;
}

export interface RevealedItem {
  id: string;
  name: string;
  description: string;
  type: string;
  properties: string[];
  effects?: {
    statModifiers?: Record<string, number>;
    revealsInformation?: string[];
    unlocksPath?: string;
  };
  requirements?: Array<{
    type: string;
    condition: string;
    value: any;
    operator?: string;
  }>;
  acquisitionMethod?: string;
}

export interface AvailableEnding {
  id: string;
  title: string;
  description: string;
  category: 'good' | 'bad' | 'neutral' | 'secret';
  requirements: Array<{
    type: string;
    condition: string;
    value?: any;
    operator?: string;
  }>;
  canBeReached: boolean;
  missingRequirements?: string[];
}

export interface ProgressiveStoryContent {
  metadata: {
    id: string;
    title: string;
    description: string;
    author: string;
    gameStyle: string;
    difficulty: string;
    estimatedLength: number;
    tags: string[];
  };
  currentBeat: StoryBeatContent;
  accessibleBeats: StoryBeatContent[];
  revealedCharacters: RevealedCharacter[];
  discoveredItems: RevealedItem[];
  availableEndings: AvailableEnding[];
  progressState: ProgressiveStoryState;
  aiGuidance: {
    toneProgression: Record<string, string>;
    narrativeStyle: Record<string, any>;
    playerAgency: string;
    mechanicsHandling: string;
    responseToPlayerMood: Record<string, string>;
    encouragedElements: string[];
    forbiddenTopics: string[];
  };
  functionCalls: Array<{
    name: string;
    description: string;
    parameters: Record<string, string>;
    restrictions?: string[];
    examples?: Array<{
      situation: string;
      call: Record<string, any>;
    }>;
  }>;
}

export interface ProgressiveLoaderConfig {
  metadataService: StoryMetadataService;
  database: HybridDatabase;
  enableSpoilerPrevention: boolean;
  maxLookaheadBeats: number;
  enableProgressCaching: boolean;
  cacheExpiryMinutes: number;
}

export class ProgressiveStoryLoader {
  private progressCache = new Map<string, ProgressiveStoryState>();
  private fullStoryCache = new Map<string, ByteboundGame>();

  constructor(private config: ProgressiveLoaderConfig) {}

  /**
   * Initialize a new story session for a player
   */
  async initializeStory(storyId: string, playerId: string): Promise<ProgressiveStoryContent> {
    // Load the full story (this is the only time we load everything)
    const fullStory = await this.config.metadataService.loadFullStory(storyId);
    if (!fullStory) {
      throw new Error(`Story not found: ${storyId}`);
    }

    // Cache the full story for reference
    this.fullStoryCache.set(storyId, fullStory);

    // Create initial progress state
    const progressState: ProgressiveStoryState = {
      storyId,
      playerId,
      currentBeatId: this.findStartingBeat(fullStory),
      accessibleBeats: [this.findStartingBeat(fullStory)],
      revealedCharacters: [],
      discoveredItems: [],
      unlockedEndings: [],
      hiddenMechanicsState: { ...fullStory.hiddenMechanics.playerStats },
      relationshipsState: { ...fullStory.hiddenMechanics.relationships },
      gameFlags: {},
      lastUpdated: new Date()
    };

    // Store progress in database
    await this.saveProgressState(progressState);
    
    // Cache progress state
    this.progressCache.set(`${storyId}:${playerId}`, progressState);

    return this.buildProgressiveContent(fullStory, progressState);
  }

  /**
   * Load current story state for an existing session
   */
  async loadStorySession(storyId: string, playerId: string): Promise<ProgressiveStoryContent> {
    // Try to get progress state from cache first
    const cacheKey = `${storyId}:${playerId}`;
    let progressState = this.progressCache.get(cacheKey);

    // Get the full story (from cache or load) - we need this first to restore relationships
    let fullStory = this.fullStoryCache.get(storyId);
    if (!fullStory) {
      fullStory = await this.config.metadataService.loadFullStory(storyId);
      if (!fullStory) {
        throw new Error(`Story not found: ${storyId}`);
      }
      this.fullStoryCache.set(storyId, fullStory);
    }

    if (!progressState) {
      // Load from database
      const storyProgress = await this.config.database.getStoryProgress(storyId, playerId);
      if (!storyProgress) {
        throw new Error(`No story session found for player ${playerId} and story ${storyId}`);
      }

      progressState = this.convertStoryProgressToState(storyProgress);
      
      // Restore initial relationship values from the full story
      progressState.relationshipsState = { ...fullStory.hiddenMechanics.relationships };
      
      this.progressCache.set(cacheKey, progressState);
    }

    return this.buildProgressiveContent(fullStory, progressState);
  }

  /**
   * Update story progress based on player action
   */
  async updateStoryProgress(
    storyId: string, 
    playerId: string, 
    updates: {
      newBeatId?: string;
      statChanges?: Record<string, number>;
      relationshipChanges?: Record<string, number>;
      flagChanges?: Record<string, boolean>;
      revealedCharacters?: string[];
      discoveredItems?: string[];
      completedObjectives?: string[];
    }
  ): Promise<ProgressiveStoryContent> {
    const cacheKey = `${storyId}:${playerId}`;
    let progressState = this.progressCache.get(cacheKey);

    if (!progressState) {
      throw new Error(`No active session found for player ${playerId} and story ${storyId}`);
    }

    // Apply updates to progress state
    if (updates.newBeatId) {
      progressState.currentBeatId = updates.newBeatId;
      if (!progressState.accessibleBeats.includes(updates.newBeatId)) {
        progressState.accessibleBeats.push(updates.newBeatId);
      }
    }

    if (updates.statChanges) {
      for (const [stat, change] of Object.entries(updates.statChanges)) {
        progressState.hiddenMechanicsState[stat] = 
          (progressState.hiddenMechanicsState[stat] || 0) + change;
      }
    }

    if (updates.relationshipChanges) {
      for (const [character, change] of Object.entries(updates.relationshipChanges)) {
        progressState.relationshipsState[character] = 
          (progressState.relationshipsState[character] || 0) + change;
      }
    }

    if (updates.flagChanges) {
      Object.assign(progressState.gameFlags, updates.flagChanges);
    }

    if (updates.revealedCharacters) {
      for (const characterId of updates.revealedCharacters) {
        if (!progressState.revealedCharacters.includes(characterId)) {
          progressState.revealedCharacters.push(characterId);
        }
      }
    }

    if (updates.discoveredItems) {
      for (const itemId of updates.discoveredItems) {
        if (!progressState.discoveredItems.includes(itemId)) {
          progressState.discoveredItems.push(itemId);
        }
      }
    }

    progressState.lastUpdated = new Date();

    // Update newly accessible beats based on progress
    const fullStory = this.fullStoryCache.get(storyId)!;
    progressState.accessibleBeats = this.calculateAccessibleBeats(fullStory, progressState);

    // Update cache
    this.progressCache.set(cacheKey, progressState);

    // Save to database
    await this.saveProgressState(progressState);

    return this.buildProgressiveContent(fullStory, progressState);
  }

  /**
   * Get available story beats that player can access
   */
  async getAccessibleBeats(storyId: string, playerId: string): Promise<string[]> {
    const cacheKey = `${storyId}:${playerId}`;
    const progressState = this.progressCache.get(cacheKey);

    if (!progressState) {
      const storyProgress = await this.config.database.getStoryProgress(storyId, playerId);
      if (!storyProgress) {
        return [];
      }
      return JSON.parse(storyProgress.completedBeats || '[]');
    }

    return progressState.accessibleBeats;
  }

  /**
   * Check if player can access a specific story beat
   */
  async canAccessBeat(storyId: string, playerId: string, beatId: string): Promise<boolean> {
    const accessibleBeats = await this.getAccessibleBeats(storyId, playerId);
    return accessibleBeats.includes(beatId);
  }

  /**
   * Get player's current hidden mechanics state
   */
  async getHiddenMechanicsState(storyId: string, playerId: string): Promise<Record<string, number>> {
    const cacheKey = `${storyId}:${playerId}`;
    const progressState = this.progressCache.get(cacheKey);

    if (progressState) {
      return { ...progressState.hiddenMechanicsState };
    }

    const storyProgress = await this.config.database.getStoryProgress(storyId, playerId);
    if (!storyProgress) {
      return {};
    }

    return JSON.parse(storyProgress.endingImplications || '{}');
  }

  /**
   * Clear cached data for a specific story/player
   */
  async clearProgressCache(storyId: string, playerId: string): Promise<void> {
    const cacheKey = `${storyId}:${playerId}`;
    this.progressCache.delete(cacheKey);
  }

  /**
   * Clear all cached data
   */
  async clearAllCaches(): Promise<void> {
    this.progressCache.clear();
    this.fullStoryCache.clear();
  }

  /**
   * Private helper methods
   */

  private findStartingBeat(story: ByteboundGame): string {
    // Find the beat with the lowest act number
    const sortedBeats = story.beats.sort((a, b) => a.act - b.act);
    return sortedBeats[0]?.id || 'start';
  }

  private calculateAccessibleBeats(story: ByteboundGame, progressState: ProgressiveStoryState): string[] {
    const accessible = [...progressState.accessibleBeats];
    
    // Check each beat to see if it should be newly accessible
    for (const beat of story.beats) {
      if (accessible.includes(beat.id)) continue;

      // Check if beat requirements are met
      if (beat.entryRequirements) {
        const canAccess = beat.entryRequirements.every(req => 
          this.evaluateRequirement(req, progressState)
        );
        
        if (canAccess) {
          accessible.push(beat.id);
        }
      }
    }

    return accessible;
  }

  private evaluateRequirement(requirement: any, progressState: ProgressiveStoryState): boolean {
    switch (requirement.type) {
      case 'stat':
        const statValue = progressState.hiddenMechanicsState[requirement.condition] || 0;
        return this.compareValues(statValue, requirement.value, requirement.operator || '>=');
      
      case 'relationship':
        const relValue = progressState.relationshipsState[requirement.condition] || 0;
        const result = this.compareValues(relValue, requirement.value, requirement.operator || '>=');
        if (requirement.condition === 'companion') {
          console.log(`[DEBUG] relationship:companion - relValue: ${relValue}, requirement.value: ${requirement.value}, operator: ${requirement.operator || '>='}, result: ${result}`);
          console.log(`[DEBUG] relationshipsState:`, progressState.relationshipsState);
        }
        return result;
      
      case 'flag':
        return progressState.gameFlags[requirement.condition] === requirement.value;
      
      case 'beat':
        return progressState.accessibleBeats.includes(requirement.condition);
      
      case 'item':
        return progressState.discoveredItems.includes(requirement.condition);
      
      case 'character':
        return progressState.revealedCharacters.includes(requirement.condition);
      
      default:
        return false;
    }
  }

  private compareValues(actual: number, expected: number, operator: string): boolean {
    switch (operator) {
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '==': return actual === expected;
      case '!=': return actual !== expected;
      default: return false;
    }
  }

  private buildProgressiveContent(story: ByteboundGame, progressState: ProgressiveStoryState): ProgressiveStoryContent {
    // Find current beat - fallback to first beat if current one is invalid
    let currentBeat = story.beats.find(b => b.id === progressState.currentBeatId);
    if (!currentBeat) {
      // Fallback to first beat if current beat is invalid (corrupted data handling)
      currentBeat = story.beats[0];
      if (!currentBeat) {
        throw new Error(`Story has no beats available`);
      }
      // Update progress state to use the fallback beat
      progressState.currentBeatId = currentBeat.id;
    }

    // Build accessible beats content (limited to prevent spoilers)
    const accessibleBeats = story.beats
      .filter(beat => progressState.accessibleBeats.includes(beat.id))
      .map(beat => this.buildBeatContent(beat, progressState));

    // Build revealed characters
    const revealedCharacters = story.characters
      ?.filter(char => progressState.revealedCharacters.includes(char.id))
      .map(char => this.buildCharacterContent(char, progressState)) || [];

    // Build discovered items
    const discoveredItems = story.items
      ?.filter(item => progressState.discoveredItems.includes(item.id))
      .map(item => this.buildItemContent(item)) || [];

    // Build available endings (show which ones are possible)
    const availableEndings = story.endings
      ?.map(ending => this.buildEndingContent(ending, progressState)) || [];

    return {
      metadata: {
        id: story.metadata.id,
        title: story.metadata.title,
        description: story.metadata.description,
        author: story.metadata.author,
        gameStyle: story.metadata.gameStyle,
        difficulty: story.metadata.difficulty,
        estimatedLength: story.metadata.estimatedLength,
        tags: story.metadata.tags
      },
      currentBeat: this.buildBeatContent(currentBeat, progressState),
      accessibleBeats,
      revealedCharacters,
      discoveredItems,
      availableEndings,
      progressState: { ...progressState },
      aiGuidance: story.aiGuidance,
      functionCalls: story.functionCalls
    };
  }

  private buildBeatContent(beat: any, progressState: ProgressiveStoryState): StoryBeatContent {
    // Filter quick actions based on requirements and visibility
    const visibleActions = beat.quickActions?.filter((action: any) => {
      // If action has requirements, check them regardless of initial visibility
      if (action.requirements) {
        return action.requirements.every((req: any) => 
          this.evaluateRequirement(req, progressState)
        );
      }
      
      // If no requirements, use the visible flag
      return action.visible;
    }) || [];

    // Filter objectives based on visibility and progress
    const visibleObjectives = beat.objectives?.filter((obj: any) => {
      return obj.visible || obj.type === 'required';
    }) || [];

    return {
      id: beat.id,
      act: beat.act,
      title: beat.title,
      description: beat.description,
      setting: beat.setting,
      entryRequirements: beat.entryRequirements,
      narrativeGuidance: beat.narrativeGuidance,
      quickActions: visibleActions,
      objectives: visibleObjectives,
      hiddenTriggers: beat.hiddenTriggers,
      exitConditions: beat.exitConditions
    };
  }

  private buildCharacterContent(character: any, progressState: ProgressiveStoryState): RevealedCharacter {
    return {
      id: character.id,
      name: character.name,
      description: character.description,
      personality: character.personality,
      role: character.role,
      stats: character.stats,
      knowledge: character.knowledge,
      secrets: character.secrets,
      relationships: character.relationships,
      companionAbilities: character.companionAbilities,
      dialogueTrees: character.dialogueTrees
    };
  }

  private buildItemContent(item: any): RevealedItem {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      type: item.type,
      properties: item.properties,
      effects: item.effects,
      requirements: item.requirements,
      acquisitionMethod: item.acquisitionMethod
    };
  }

  private buildEndingContent(ending: any, progressState: ProgressiveStoryState): AvailableEnding {
    const missingRequirements: string[] = [];
    const canBeReached = ending.requirements.every((req: any) => {
      const met = this.evaluateRequirement(req, progressState);
      if (!met) {
        missingRequirements.push(`${req.type}:${req.condition}`);
      }
      return met;
    });

    return {
      id: ending.id,
      title: ending.title,
      description: ending.description,
      category: ending.category,
      requirements: ending.requirements,
      canBeReached,
      missingRequirements: missingRequirements.length > 0 ? missingRequirements : undefined
    };
  }

  private async saveProgressState(progressState: ProgressiveStoryState): Promise<void> {
    const storyProgress: StoryProgress = {
      id: `${progressState.storyId}_${progressState.playerId}`,
      storyId: progressState.storyId,
      playerId: progressState.playerId,
      currentBeatId: progressState.currentBeatId,
      completedBeats: JSON.stringify(progressState.accessibleBeats),
      visitedLocations: JSON.stringify([]),
      metCharacters: JSON.stringify(progressState.revealedCharacters),
      discoveredSecrets: JSON.stringify(progressState.discoveredItems),
      endingImplications: JSON.stringify(progressState.hiddenMechanicsState),
      lastPlayed: progressState.lastUpdated,
      totalPlayTime: 0
    };

    await this.config.database.updateStoryProgress(storyProgress);
  }

  private convertStoryProgressToState(storyProgress: StoryProgress): ProgressiveStoryState {
    const safeJsonParse = (jsonString: string, fallback: any) => {
      try {
        return JSON.parse(jsonString);
      } catch {
        return fallback;
      }
    };

    return {
      storyId: storyProgress.storyId,
      playerId: storyProgress.playerId,
      currentBeatId: storyProgress.currentBeatId,
      accessibleBeats: safeJsonParse(storyProgress.completedBeats || '[]', []),
      revealedCharacters: safeJsonParse(storyProgress.metCharacters || '[]', []),
      discoveredItems: safeJsonParse(storyProgress.discoveredSecrets || '[]', []),
      unlockedEndings: [],
      hiddenMechanicsState: safeJsonParse(storyProgress.endingImplications || '{}', {}),
      relationshipsState: {},
      gameFlags: {},
      lastUpdated: storyProgress.lastPlayed
    };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      activeSessions: this.progressCache.size,
      cachedStories: this.fullStoryCache.size,
      spoilerPreventionEnabled: this.config.enableSpoilerPrevention,
      maxLookaheadBeats: this.config.maxLookaheadBeats
    };
  }
}