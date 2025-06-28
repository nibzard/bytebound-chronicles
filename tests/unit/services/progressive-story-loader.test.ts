// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Unit tests for ProgressiveStoryLoader
 * Tests progressive story loading, spoiler prevention, and state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressiveStoryLoader } from '../../../src/services/ProgressiveStoryLoader.js';
import { StoryMetadataService } from '../../../src/services/StoryMetadataService.js';
import { HybridDatabase } from '../../../src/database/HybridDatabase.js';
import { ByteboundGame } from '../../../src/validation/game-schema-validator.js';

// Create mock implementations
const mockMetadataService = {
  loadFullStory: vi.fn()
} as any;

const mockDatabase = {
  getStoryProgress: vi.fn(),
  updateStoryProgress: vi.fn()
} as any;

describe('ProgressiveStoryLoader', () => {
  let loader: ProgressiveStoryLoader;
  let mockStory: ByteboundGame;

  beforeEach(() => {
    loader = new ProgressiveStoryLoader({
      metadataService: mockMetadataService,
      database: mockDatabase,
      enableSpoilerPrevention: true,
      maxLookaheadBeats: 3,
      enableProgressCaching: true,
      cacheExpiryMinutes: 30
    });

    // Create a comprehensive mock story for testing
    mockStory = {
      metadata: {
        id: 'test-story',
        title: 'Test Adventure',
        description: 'A test story for progressive loading',
        author: 'Test Author',
        version: '1.0.0',
        gameStyle: 'rpg-fantasy',
        difficulty: 'medium',
        estimatedLength: 120,
        tags: ['test', 'adventure'],
        language: 'en'
      },
      hiddenMechanics: {
        playerStats: {
          health: 100,
          reputation: 0,
          investigation: 0
        },
        thresholds: {
          high_reputation: 80,
          investigation_breakthrough: 5
        },
        relationships: {
          companion: 0,
          villain: 0
        }
      },
      beats: [
        {
          id: 'start',
          act: 1,
          title: 'Beginning',
          narrativeGuidance: {
            openingText: 'The adventure begins...',
            dynamicElements: {}
          },
          quickActions: [
            {
              id: 'basic_action',
              label: 'Basic Action',
              description: 'A basic action available to all',
              icon: '⚡',
              visible: true,
              effects: {
                statChanges: { health: 10 }
              }
            },
            {
              id: 'advanced_action',
              label: 'Advanced Action',
              description: 'Requires high reputation',
              icon: '🌟',
              visible: false,
              requirements: [
                {
                  type: 'stat',
                  condition: 'reputation',
                  value: 50,
                  operator: '>='
                }
              ]
            }
          ],
          objectives: [
            {
              id: 'start_objective',
              description: 'Begin the adventure',
              type: 'required',
              visible: true,
              weight: 1
            }
          ],
          exitConditions: [
            {
              requirements: [
                {
                  type: 'objective',
                  condition: 'start_objective'
                }
              ],
              nextBeat: 'middle',
              automatic: false
            }
          ]
        },
        {
          id: 'middle',
          act: 2,
          title: 'Middle Section',
          entryRequirements: [
            {
              type: 'beat',
              condition: 'start'
            }
          ],
          narrativeGuidance: {
            openingText: 'The plot thickens...'
          },
          quickActions: [
            {
              id: 'investigate',
              label: 'Investigate',
              description: 'Look for clues',
              icon: '🔍',
              visible: true,
              effects: {
                statChanges: { investigation: 1 }
              }
            }
          ],
          objectives: [
            {
              id: 'middle_objective',
              description: 'Uncover the mystery',
              type: 'required',
              visible: true,
              weight: 2
            }
          ],
          exitConditions: [
            {
              requirements: [
                {
                  type: 'stat',
                  condition: 'investigation',
                  value: 3,
                  operator: '>='
                }
              ],
              nextBeat: 'end',
              automatic: false
            }
          ]
        },
        {
          id: 'end',
          act: 3,
          title: 'Conclusion',
          entryRequirements: [
            {
              type: 'stat',
              condition: 'investigation',
              value: 3,
              operator: '>='
            }
          ],
          narrativeGuidance: {
            openingText: 'The adventure concludes...'
          },
          quickActions: [],
          objectives: [],
          exitConditions: []
        }
      ],
      characters: [
        {
          id: 'companion',
          name: 'Loyal Companion',
          description: 'Your trusted ally',
          personality: ['loyal', 'brave'],
          role: 'ally',
          stats: { courage: 15 },
          knowledge: ['local_area', 'combat'],
          relationships: {
            player: 'ally'
          }
        },
        {
          id: 'villain',
          name: 'Dark Antagonist',
          description: 'Your primary foe',
          personality: ['cunning', 'ruthless'],
          role: 'antagonist',
          stats: { power: 20 },
          knowledge: ['dark_magic', 'ancient_secrets'],
          relationships: {
            player: 'enemy'
          }
        }
      ],
      items: [
        {
          id: 'magic_sword',
          name: 'Enchanted Blade',
          description: 'A sword imbued with ancient magic',
          type: 'weapon',
          properties: ['magical', 'sharp'],
          effects: {
            statModifiers: { attack: 10 }
          }
        },
        {
          id: 'secret_key',
          name: 'Mysterious Key',
          description: 'Opens hidden doors',
          type: 'key',
          properties: ['unique', 'mysterious'],
          requirements: [
            {
              type: 'stat',
              condition: 'investigation',
              value: 5,
              operator: '>='
            }
          ]
        }
      ],
      endings: [
        {
          id: 'hero_ending',
          title: 'Hero\'s Victory',
          description: 'You save the day',
          category: 'good',
          requirements: [
            {
              type: 'stat',
              condition: 'reputation',
              value: 80,
              operator: '>='
            },
            {
              type: 'relationship',
              condition: 'companion',
              value: 50,
              operator: '>='
            }
          ]
        },
        {
          id: 'neutral_ending',
          title: 'Balanced Resolution',
          description: 'A compromise is reached',
          category: 'neutral',
          requirements: [
            {
              type: 'stat',
              condition: 'investigation',
              value: 3,
              operator: '>='
            }
          ]
        }
      ],
      aiGuidance: {
        toneProgression: {
          act1: 'mysterious and engaging'
        },
        narrativeStyle: {
          perspective: 'second-person'
        },
        playerAgency: 'high',
        mechanicsHandling: 'hidden from player',
        responseToPlayerMood: {
          curious: 'provide more investigation opportunities'
        },
        encouragedElements: ['exploration', 'character development'],
        forbiddenTopics: ['graphic violence']
      },
      functionCalls: [
        {
          name: 'updateStats',
          description: 'Update player statistics',
          parameters: {
            health: 'number - player health',
            reputation: 'number - player reputation'
          }
        }
      ]
    } as ByteboundGame;

    // Reset mocks
    mockMetadataService.loadFullStory.mockClear();
    mockDatabase.getStoryProgress.mockClear();
    mockDatabase.updateStoryProgress.mockClear();
  });

  afterEach(async () => {
    await loader.clearAllCaches();
  });

  describe('Story Initialization', () => {
    it('should initialize a new story session', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);

      const content = await loader.initializeStory('test-story', 'player1');

      expect(content).toBeDefined();
      expect(content.metadata.id).toBe('test-story');
      expect(content.currentBeat.id).toBe('start');
      expect(content.progressState.currentBeatId).toBe('start');
      expect(content.progressState.accessibleBeats).toContain('start');
      expect(content.progressState.hiddenMechanicsState.health).toBe(100);

      expect(mockMetadataService.loadFullStory).toHaveBeenCalledWith('test-story');
      expect(mockDatabase.updateStoryProgress).toHaveBeenCalled();
    });

    it('should throw error for non-existent story', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(null);

      await expect(loader.initializeStory('non-existent', 'player1'))
        .rejects.toThrow('Story not found: non-existent');
    });

    it('should set initial hidden mechanics state correctly', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);

      const content = await loader.initializeStory('test-story', 'player1');

      expect(content.progressState.hiddenMechanicsState).toEqual({
        health: 100,
        reputation: 0,
        investigation: 0
      });
      expect(content.progressState.relationshipsState).toEqual({
        companion: 0,
        villain: 0
      });
    });
  });

  describe('Story Session Loading', () => {
    it('should load existing story session from database', async () => {
      const mockProgress = {
        id: 'test-story_player1',
        storyId: 'test-story',
        playerId: 'player1',
        currentBeatId: 'middle',
        completedBeats: '["start", "middle"]',
        metCharacters: '["companion"]',
        discoveredSecrets: '["magic_sword"]',
        endingImplications: '{"health": 90, "reputation": 25, "investigation": 2}',
        lastPlayed: new Date(),
        totalPlayTime: 60
      };

      mockDatabase.getStoryProgress.mockResolvedValue(mockProgress);
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);

      const content = await loader.loadStorySession('test-story', 'player1');

      expect(content.currentBeat.id).toBe('middle');
      expect(content.accessibleBeats).toHaveLength(2); // start and middle
      expect(content.revealedCharacters).toHaveLength(1);
      expect(content.revealedCharacters[0].id).toBe('companion');
      expect(content.discoveredItems).toHaveLength(1);
      expect(content.discoveredItems[0].id).toBe('magic_sword');
    });

    it('should throw error when no session exists', async () => {
      mockDatabase.getStoryProgress.mockResolvedValue(null);

      await expect(loader.loadStorySession('test-story', 'player1'))
        .rejects.toThrow('No story session found');
    });

    it('should use cached progress state when available', async () => {
      // First initialize a session
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);
      
      await loader.initializeStory('test-story', 'player1');

      // Clear database mock call count
      mockDatabase.getStoryProgress.mockClear();

      // Load session again - should use cache
      const content = await loader.loadStorySession('test-story', 'player1');

      expect(content.currentBeat.id).toBe('start');
      expect(mockDatabase.getStoryProgress).not.toHaveBeenCalled();
    });
  });

  describe('Progress Updates', () => {
    beforeEach(async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);
      
      // Initialize a story session
      await loader.initializeStory('test-story', 'player1');
    });

    it('should update story progress with new beat', async () => {
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        newBeatId: 'middle',
        statChanges: { investigation: 1 }
      });

      expect(updatedContent.currentBeat.id).toBe('middle');
      expect(updatedContent.progressState.hiddenMechanicsState.investigation).toBe(1);
      expect(updatedContent.accessibleBeats).toHaveLength(2); // start and middle
    });

    it('should update relationship states', async () => {
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        relationshipChanges: { companion: 25, villain: -10 }
      });

      expect(updatedContent.progressState.relationshipsState.companion).toBe(25);
      expect(updatedContent.progressState.relationshipsState.villain).toBe(-10);
    });

    it('should reveal characters when specified', async () => {
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        revealedCharacters: ['companion', 'villain']
      });

      expect(updatedContent.revealedCharacters).toHaveLength(2);
      expect(updatedContent.revealedCharacters.map(c => c.id)).toContain('companion');
      expect(updatedContent.revealedCharacters.map(c => c.id)).toContain('villain');
    });

    it('should discover items when specified', async () => {
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        discoveredItems: ['magic_sword']
      });

      expect(updatedContent.discoveredItems).toHaveLength(1);
      expect(updatedContent.discoveredItems[0].id).toBe('magic_sword');
    });

    it('should update game flags', async () => {
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        flagChanges: { discovered_secret: true, talked_to_guard: false }
      });

      expect(updatedContent.progressState.gameFlags.discovered_secret).toBe(true);
      expect(updatedContent.progressState.gameFlags.talked_to_guard).toBe(false);
    });

    it('should throw error for non-existent session', async () => {
      await expect(loader.updateStoryProgress('test-story', 'non-existent-player', {
        newBeatId: 'middle'
      })).rejects.toThrow('No active session found');
    });
  });

  describe('Spoiler Prevention', () => {
    beforeEach(async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);
      
      await loader.initializeStory('test-story', 'player1');
    });

    it('should only show accessible beats', async () => {
      const content = await loader.loadStorySession('test-story', 'player1');

      // Should only have access to start beat initially
      expect(content.accessibleBeats).toHaveLength(1);
      expect(content.accessibleBeats[0].id).toBe('start');
      
      // End beat should not be accessible yet
      const endBeat = content.accessibleBeats.find(b => b.id === 'end');
      expect(endBeat).toBeUndefined();
    });

    it('should hide quick actions based on requirements', async () => {
      const content = await loader.loadStorySession('test-story', 'player1');
      const startBeat = content.currentBeat;

      // Basic action should be visible
      const basicAction = startBeat.quickActions.find(a => a.id === 'basic_action');
      expect(basicAction).toBeDefined();

      // Advanced action should be hidden (requires high reputation)
      const advancedAction = startBeat.quickActions.find(a => a.id === 'advanced_action');
      expect(advancedAction).toBeUndefined();
    });

    it('should reveal actions when requirements are met', async () => {
      // Update reputation to meet requirement
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        statChanges: { reputation: 60 }
      });

      const startBeat = updatedContent.currentBeat;
      const advancedAction = startBeat.quickActions.find(a => a.id === 'advanced_action');
      expect(advancedAction).toBeDefined();
    });

    it('should reveal new beats when entry requirements are met', async () => {
      // Update to access middle beat
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        newBeatId: 'middle'
      });

      expect(updatedContent.accessibleBeats).toHaveLength(2);
      expect(updatedContent.accessibleBeats.map(b => b.id)).toContain('middle');
      
      // End beat should still not be accessible (requires investigation >= 3)
      const endBeat = updatedContent.accessibleBeats.find(b => b.id === 'end');
      expect(endBeat).toBeUndefined();
    });

    it('should show only revealed characters', async () => {
      const content = await loader.loadStorySession('test-story', 'player1');
      
      // No characters revealed initially
      expect(content.revealedCharacters).toHaveLength(0);

      // Reveal one character
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        revealedCharacters: ['companion']
      });

      expect(updatedContent.revealedCharacters).toHaveLength(1);
      expect(updatedContent.revealedCharacters[0].id).toBe('companion');
    });

    it('should show only discovered items', async () => {
      const content = await loader.loadStorySession('test-story', 'player1');
      
      // No items discovered initially
      expect(content.discoveredItems).toHaveLength(0);

      // Discover an item
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        discoveredItems: ['magic_sword']
      });

      expect(updatedContent.discoveredItems).toHaveLength(1);
      expect(updatedContent.discoveredItems[0].id).toBe('magic_sword');
    });
  });

  describe('Ending Analysis', () => {
    beforeEach(async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);
      
      await loader.initializeStory('test-story', 'player1');
    });

    it('should show which endings are available', async () => {
      const content = await loader.loadStorySession('test-story', 'player1');

      // Debug: Check the relationships state
      console.log('relationshipsState after loadStorySession:', content.progressState.relationshipsState);

      expect(content.availableEndings).toHaveLength(2);
      
      // Hero ending should not be reachable initially
      const heroEnding = content.availableEndings.find(e => e.id === 'hero_ending');
      console.log('heroEnding.missingRequirements:', heroEnding?.missingRequirements);
      expect(heroEnding?.canBeReached).toBe(false);
      expect(heroEnding?.missingRequirements).toContain('stat:reputation');
      expect(heroEnding?.missingRequirements).toContain('relationship:companion');

      // Neutral ending should not be reachable initially
      const neutralEnding = content.availableEndings.find(e => e.id === 'neutral_ending');
      expect(neutralEnding?.canBeReached).toBe(false);
      expect(neutralEnding?.missingRequirements).toContain('stat:investigation');
    });

    it('should update ending availability as progress changes', async () => {
      // Update stats to meet neutral ending requirements
      const updatedContent = await loader.updateStoryProgress('test-story', 'player1', {
        statChanges: { investigation: 3 }
      });

      const neutralEnding = updatedContent.availableEndings.find(e => e.id === 'neutral_ending');
      expect(neutralEnding?.canBeReached).toBe(true);
      expect(neutralEnding?.missingRequirements).toBeUndefined();

      // Hero ending should still not be reachable
      const heroEnding = updatedContent.availableEndings.find(e => e.id === 'hero_ending');
      expect(heroEnding?.canBeReached).toBe(false);
    });
  });

  describe('Accessibility Checks', () => {
    beforeEach(async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);
      
      await loader.initializeStory('test-story', 'player1');
    });

    it('should check if player can access specific beats', async () => {
      const canAccessStart = await loader.canAccessBeat('test-story', 'player1', 'start');
      expect(canAccessStart).toBe(true);

      const canAccessMiddle = await loader.canAccessBeat('test-story', 'player1', 'middle');
      expect(canAccessMiddle).toBe(false);

      const canAccessEnd = await loader.canAccessBeat('test-story', 'player1', 'end');
      expect(canAccessEnd).toBe(false);
    });

    it('should return accessible beats list', async () => {
      const accessibleBeats = await loader.getAccessibleBeats('test-story', 'player1');
      expect(accessibleBeats).toContain('start');
      expect(accessibleBeats).not.toContain('middle');
      expect(accessibleBeats).not.toContain('end');
    });

    it('should get current hidden mechanics state', async () => {
      const mechanicsState = await loader.getHiddenMechanicsState('test-story', 'player1');
      expect(mechanicsState.health).toBe(100);
      expect(mechanicsState.reputation).toBe(0);
      expect(mechanicsState.investigation).toBe(0);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache full stories for performance', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);

      // Initialize story
      await loader.initializeStory('test-story', 'player1');
      
      // Load again - should use cache
      await loader.loadStorySession('test-story', 'player1');

      expect(mockMetadataService.loadFullStory).toHaveBeenCalledTimes(1);
    });

    it('should cache progress states', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);

      await loader.initializeStory('test-story', 'player1');

      // Clear database mock
      mockDatabase.getStoryProgress.mockClear();

      // Load session should use cached progress
      await loader.loadStorySession('test-story', 'player1');

      expect(mockDatabase.getStoryProgress).not.toHaveBeenCalled();
    });

    it('should clear caches when requested', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);

      await loader.initializeStory('test-story', 'player1');
      
      const statsBefore = loader.getStats();
      expect(statsBefore.activeSessions).toBeGreaterThan(0);
      expect(statsBefore.cachedStories).toBeGreaterThan(0);

      await loader.clearAllCaches();

      const statsAfter = loader.getStats();
      expect(statsAfter.activeSessions).toBe(0);
      expect(statsAfter.cachedStories).toBe(0);
    });

    it('should clear individual progress cache', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);
      mockDatabase.updateStoryProgress.mockResolvedValue(undefined);

      await loader.initializeStory('test-story', 'player1');
      
      await loader.clearProgressCache('test-story', 'player1');

      // Next load should fetch from database
      mockDatabase.getStoryProgress.mockResolvedValue({
        id: 'test-story_player1',
        storyId: 'test-story',
        playerId: 'player1',
        currentBeatId: 'start',
        completedBeats: '["start"]',
        metCharacters: '[]',
        discoveredSecrets: '[]',
        endingImplications: '{}',
        lastPlayed: new Date(),
        totalPlayTime: 0
      });

      await loader.loadStorySession('test-story', 'player1');

      expect(mockDatabase.getStoryProgress).toHaveBeenCalled();
    });
  });

  describe('Service Statistics', () => {
    it('should provide service statistics', () => {
      const stats = loader.getStats();
      
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('cachedStories');
      expect(stats).toHaveProperty('spoilerPreventionEnabled');
      expect(stats).toHaveProperty('maxLookaheadBeats');
      expect(stats.spoilerPreventionEnabled).toBe(true);
      expect(stats.maxLookaheadBeats).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing current beat gracefully', async () => {
      const invalidStory = {
        ...mockStory,
        beats: [] // No beats
      };

      mockMetadataService.loadFullStory.mockResolvedValue(invalidStory);

      await expect(loader.initializeStory('test-story', 'player1'))
        .rejects.toThrow('Story has no beats available');
    });

    it('should handle corrupted progress data', async () => {
      const corruptedProgress = {
        id: 'test-story_player1',
        storyId: 'test-story',
        playerId: 'player1',
        currentBeatId: 'invalid-beat',
        completedBeats: 'invalid json',
        metCharacters: '[]',
        discoveredSecrets: '[]',
        endingImplications: '{}',
        lastPlayed: new Date(),
        totalPlayTime: 0
      };

      mockDatabase.getStoryProgress.mockResolvedValue(corruptedProgress);
      mockMetadataService.loadFullStory.mockResolvedValue(mockStory);

      // Should handle invalid JSON gracefully
      const content = await loader.loadStorySession('test-story', 'player1');
      expect(content.progressState.accessibleBeats).toEqual([]);
    });
  });
});