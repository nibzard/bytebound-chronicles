// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Unit tests for StoryValidationService
 * Tests comprehensive story validation, quality scoring, and rule execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryValidationService, type ValidationRule } from '../../../src/services/StoryValidationService.js';
import { StoryMetadataService } from '../../../src/services/StoryMetadataService.js';
import { ByteboundGame } from '../../../src/validation/game-schema-validator.js';

// Create mock metadata service
const mockMetadataService = {
  loadFullStory: vi.fn()
} as any;

describe('StoryValidationService', () => {
  let validationService: StoryValidationService;
  let validStory: ByteboundGame;
  let invalidStory: ByteboundGame;

  beforeEach(() => {
    validationService = new StoryValidationService({
      metadataService: mockMetadataService,
      enableContentAnalysis: true,
      enableBalanceChecking: true,
      enableAccessibilityChecks: true,
      strictMode: false,
      customRules: []
    });

    // Create a valid story for testing
    validStory = {
      metadata: {
        id: 'valid-story',
        title: 'A Great Adventure',
        description: 'An amazing story with rich narrative and compelling characters.',
        author: 'Test Author',
        version: '1.0.0',
        gameStyle: 'rpg-fantasy',
        difficulty: 'medium',
        estimatedLength: 120,
        tags: ['adventure', 'fantasy'],
        language: 'en',
        contentWarnings: ['mild violence']
      },
      hiddenMechanics: {
        playerStats: {
          health: 100,
          reputation: 0,
          courage: 0
        },
        thresholds: {
          heroic: 80,
          respected: 50
        },
        relationships: {
          companion: 0,
          mentor: 0
        }
      },
      beats: [
        {
          id: 'start',
          act: 1,
          title: 'The Journey Begins',
          narrativeGuidance: {
            openingText: 'You stand at the edge of a great adventure, the path ahead unknown but filled with promise and danger.'
          },
          quickActions: [
            {
              id: 'brave_choice',
              label: 'Face the challenge head-on',
              description: 'Show courage in the face of danger',
              icon: '⚔️',
              visible: true,
              effects: {
                statChanges: { courage: 10 }
              }
            },
            {
              id: 'cautious_choice',
              label: 'Proceed carefully',
              description: 'Take a more measured approach',
              icon: '🛡️',
              visible: true,
              effects: {
                statChanges: { health: 5 }
              }
            }
          ],
          objectives: [
            {
              id: 'begin_journey',
              description: 'Start your adventure',
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
                  condition: 'begin_journey'
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
          title: 'The Test',
          narrativeGuidance: {
            openingText: 'Your choices have led you to this moment of truth. The real challenge begins now.'
          },
          quickActions: [
            {
              id: 'help_companion',
              label: 'Help your companion',
              description: 'Aid your ally in their time of need',
              icon: '🤝',
              visible: true,
              effects: {
                statChanges: { reputation: 15 },
                addsItem: 'friendship_token'
              }
            }
          ],
          objectives: [],
          exitConditions: [
            {
              requirements: [
                {
                  type: 'stat',
                  condition: 'reputation',
                  value: 10,
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
          title: 'Resolution',
          narrativeGuidance: {
            openingText: 'Your journey reaches its conclusion. The choices you made have shaped your destiny.'
          },
          quickActions: [],
          objectives: [],
          exitConditions: []
        }
      ],
      characters: [
        {
          id: 'companion',
          name: 'Loyal Friend',
          description: 'A trusted companion who has stood by your side through thick and thin.',
          personality: ['loyal', 'brave', 'honest'],
          role: 'ally',
          stats: { loyalty: 15 },
          knowledge: ['local_customs', 'survival_skills'],
          relationships: {
            player: 'friend'
          }
        },
        {
          id: 'mentor',
          name: 'Wise Guide',
          description: 'An experienced advisor who provides wisdom and guidance on your journey.',
          personality: ['wise', 'patient', 'mysterious'],
          role: 'mentor',
          stats: { wisdom: 20 },
          knowledge: ['ancient_lore', 'magic_theory'],
          relationships: {
            player: 'mentor'
          }
        }
      ],
      items: [
        {
          id: 'friendship_token',
          name: 'Token of Friendship',
          description: 'A small memento that represents the bond between you and your companion.',
          type: 'quest_item',
          properties: ['valuable', 'unique'],
          effects: {
            statModifiers: { reputation: 5 }
          }
        }
      ],
      endings: [
        {
          id: 'hero_ending',
          title: 'The Hero\'s Path',
          description: 'You emerge as a true hero, respected by all.',
          category: 'good',
          requirements: [
            {
              type: 'stat',
              condition: 'reputation',
              value: 50,
              operator: '>='
            }
          ]
        },
        {
          id: 'neutral_ending',
          title: 'A Quiet Resolution',
          description: 'Your journey ends peacefully, if unremarkably.',
          category: 'neutral',
          requirements: [
            {
              type: 'stat',
              condition: 'health',
              value: 50,
              operator: '>='
            }
          ]
        }
      ],
      aiGuidance: {
        toneProgression: {
          act1: 'hopeful and adventurous'
        },
        narrativeStyle: {
          perspective: 'second-person'
        },
        playerAgency: 'high',
        mechanicsHandling: 'hidden',
        responseToPlayerMood: {
          excited: 'enhance adventure elements'
        },
        encouragedElements: ['character development', 'meaningful choices'],
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
    };

    // Create an invalid story for testing
    invalidStory = {
      metadata: {
        id: '',  // Invalid: empty ID
        title: '',  // Invalid: empty title
        description: 'Short',  // Invalid: too short
        author: 'Test Author',
        version: '1.0.0',
        gameStyle: '' as any,  // Invalid: empty game style
        difficulty: 'medium',
        estimatedLength: -10,  // Invalid: negative length
        tags: [],
        language: 'en'
        // Missing content warnings for potentially sensitive content
      },
      hiddenMechanics: {
        playerStats: {},  // Empty stats
        thresholds: {
          impossible: 100  // Threshold higher than any way to achieve it
        },
        relationships: {}
      },
      beats: [],  // Invalid: no beats
      characters: [
        {
          id: 'bad_character',
          name: 'Bad Character',
          description: '',  // Invalid: empty description
          personality: [],  // Invalid: no personality
          role: 'npc'
        }
      ],
      items: [],
      endings: [],
      aiGuidance: {
        toneProgression: {},
        narrativeStyle: {},
        playerAgency: '',
        mechanicsHandling: '',
        responseToPlayerMood: {},
        encouragedElements: [],
        forbiddenTopics: []
      },
      functionCalls: []
    };

    // Reset mocks
    mockMetadataService.loadFullStory.mockClear();
  });

  describe('Story Validation', () => {
    it('should validate a well-formed story successfully', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(validStory);

      const result = await validationService.validateStory('valid-story');

      expect(result.valid).toBe(true);
      expect(result.storyId).toBe('valid-story');
      expect(result.summary.errors).toBe(0);
      expect(result.summary.criticalIssues).toBe(0);
      expect(result.qualityScore).toBeGreaterThan(80);
      expect(result.metadata.totalBeats).toBe(3);
      expect(result.metadata.totalCharacters).toBe(2);
      expect(result.metadata.totalItems).toBe(1);
      expect(result.metadata.totalEndings).toBe(2);
    });

    it('should identify issues in a malformed story', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(invalidStory);

      const result = await validationService.validateStory('invalid-story');

      expect(result.valid).toBe(false);
      expect(result.summary.errors).toBeGreaterThan(0);
      expect(result.summary.criticalIssues).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThan(50);

      // Check for specific issues
      const issueCodes = result.issues.map(issue => issue.code);
      expect(issueCodes).toContain('MISSING_TITLE');
      expect(issueCodes).toContain('MISSING_GAME_STYLE');
      expect(issueCodes).toContain('NO_STORY_BEATS');
    });

    it('should handle non-existent story gracefully', async () => {
      mockMetadataService.loadFullStory.mockResolvedValue(null);

      const result = await validationService.validateStory('non-existent');

      expect(result.valid).toBe(false);
      expect(result.summary.criticalIssues).toBe(1);
      expect(result.issues[0].code).toBe('VALIDATION_FAILED');
      expect(result.issues[0].message).toContain('Story not found');
    });

    it('should handle story loading errors', async () => {
      mockMetadataService.loadFullStory.mockRejectedValue(new Error('File not found'));

      const result = await validationService.validateStory('error-story');

      expect(result.valid).toBe(false);
      expect(result.issues[0].code).toBe('VALIDATION_FAILED');
      expect(result.issues[0].message).toContain('File not found');
    });
  });

  describe('Structural Validation Rules', () => {
    it('should check required metadata fields', async () => {
      const storyWithMissingMetadata = {
        ...validStory,
        metadata: {
          ...validStory.metadata,
          title: '',
          gameStyle: '' as any,
          estimatedLength: 0
        }
      };

      const result = await validationService.validateStoryContent(storyWithMissingMetadata);

      const issueCodes = result.issues.map(issue => issue.code);
      expect(issueCodes).toContain('MISSING_TITLE');
      expect(issueCodes).toContain('MISSING_GAME_STYLE');
      expect(issueCodes).toContain('INVALID_ESTIMATED_LENGTH');
    });

    it('should check beat connectivity', async () => {
      const storyWithUnreachableBeat = {
        ...validStory,
        beats: [
          ...validStory.beats,
          {
            id: 'unreachable',
            act: 4,
            title: 'Unreachable Beat',
            narrativeGuidance: {
              openingText: 'This beat cannot be reached.'
            },
            quickActions: [],
            objectives: [],
            exitConditions: []
          }
        ]
      };

      const result = await validationService.validateStoryContent(storyWithUnreachableBeat);

      const unreachableIssue = result.issues.find(issue => issue.code === 'UNREACHABLE_BEAT');
      expect(unreachableIssue).toBeDefined();
      expect(unreachableIssue?.message).toContain('unreachable');
    });

    it('should check reference integrity', async () => {
      const storyWithBadReferences = {
        ...validStory,
        beats: [
          {
            ...validStory.beats[0],
            quickActions: [
              {
                id: 'bad_action',
                label: 'Bad Action',
                description: 'References non-existent item',
                icon: '❌',
                visible: true,
                effects: {
                  addsItem: 'non_existent_item'
                }
              }
            ],
            exitConditions: [
              {
                requirements: [],
                nextBeat: 'non_existent_beat',
                automatic: false
              }
            ]
          }
        ]
      };

      const result = await validationService.validateStoryContent(storyWithBadReferences);

      const issueCodes = result.issues.map(issue => issue.code);
      expect(issueCodes).toContain('INVALID_ITEM_REFERENCE');
      expect(issueCodes).toContain('INVALID_BEAT_REFERENCE');
    });

    it('should identify dead end beats', async () => {
      const storyWithDeadEnd = {
        ...validStory,
        beats: [
          {
            ...validStory.beats[0],
            exitConditions: []  // No exit conditions and no endings
          }
        ],
        endings: []  // No endings defined
      };

      const result = await validationService.validateStoryContent(storyWithDeadEnd);

      const deadEndIssue = result.issues.find(issue => issue.code === 'DEAD_END_BEAT');
      expect(deadEndIssue).toBeDefined();
    });
  });

  describe('Content Quality Rules', () => {
    it('should check narrative quality', async () => {
      const storyWithPoorNarrative = {
        ...validStory,
        beats: [
          {
            ...validStory.beats[0],
            narrativeGuidance: {
              openingText: 'Short'  // Too short
            }
          },
          {
            ...validStory.beats[1],
            narrativeGuidance: {
              openingText: 'This is placeholder text that needs to be replaced'  // Placeholder content
            }
          }
        ]
      };

      const result = await validationService.validateStoryContent(storyWithPoorNarrative);

      const issueCodes = result.issues.map(issue => issue.code);
      expect(issueCodes).toContain('INSUFFICIENT_NARRATIVE');
      expect(issueCodes).toContain('PLACEHOLDER_CONTENT');
    });

    it('should check character development', async () => {
      const storyWithPoorCharacters = {
        ...validStory,
        characters: [
          {
            id: 'bad_character',
            name: 'Bad Character',
            description: 'Short',  // Too short
            personality: [],  // No personality
            role: 'npc'
          }
        ]
      };

      const result = await validationService.validateStoryContent(storyWithPoorCharacters);

      const issueCodes = result.issues.map(issue => issue.code);
      expect(issueCodes).toContain('INSUFFICIENT_CHARACTER_DESCRIPTION');
      expect(issueCodes).toContain('NO_CHARACTER_PERSONALITY');
    });

    it('should handle stories with no characters', async () => {
      const storyWithNoCharacters = {
        ...validStory,
        characters: []
      };

      const result = await validationService.validateStoryContent(storyWithNoCharacters);

      const noCharacterIssue = result.issues.find(issue => issue.code === 'NO_CHARACTERS');
      expect(noCharacterIssue).toBeDefined();
      expect(noCharacterIssue?.type).toBe('info');
    });
  });

  describe('Balance Validation Rules', () => {
    it('should check progression balance', async () => {
      const storyWithBalanceIssues = {
        ...validStory,
        hiddenMechanics: {
          playerStats: {},  // No stats
          thresholds: {
            impossible: 100  // Threshold with no way to reach it
          },
          relationships: {}
        }
      };

      const result = await validationService.validateStoryContent(storyWithBalanceIssues);

      const issueCodes = result.issues.map(issue => issue.code);
      expect(issueCodes).toContain('NO_PLAYER_STATS');
      expect(issueCodes).toContain('UNREACHABLE_THRESHOLD');
    });

    it('should check choice diversity', async () => {
      const storyWithLimitedChoices = {
        ...validStory,
        beats: [
          {
            ...validStory.beats[0],
            quickActions: []  // No choices
          },
          {
            ...validStory.beats[1],
            quickActions: [
              {
                id: 'only_choice',
                label: 'Only Choice',
                description: 'The only option available',
                icon: '🤷',
                visible: true
              }
            ]
          }
        ]
      };

      const result = await validationService.validateStoryContent(storyWithLimitedChoices);

      const issueCodes = result.issues.map(issue => issue.code);
      expect(issueCodes).toContain('NO_PLAYER_CHOICES');
      expect(issueCodes).toContain('LIMITED_PLAYER_CHOICES');
    });
  });

  describe('Accessibility Rules', () => {
    it('should check content warnings', async () => {
      const storyWithSensitiveContent = {
        ...validStory,
        metadata: {
          ...validStory.metadata,
          contentWarnings: []  // No warnings despite sensitive content
        },
        beats: [
          {
            ...validStory.beats[0],
            narrativeGuidance: {
              openingText: 'The scene is filled with violence and blood as the battle rages on.'
            }
          }
        ]
      };

      const result = await validationService.validateStoryContent(storyWithSensitiveContent);

      const warningIssue = result.issues.find(issue => issue.code === 'MISSING_CONTENT_WARNINGS');
      expect(warningIssue).toBeDefined();
    });

    it('should check difficulty accessibility', async () => {
      const easyStoryWithComplexity = {
        ...validStory,
        metadata: {
          ...validStory.metadata,
          difficulty: 'easy'
        },
        beats: Array.from({ length: 15 }, (_, i) => ({
          id: `beat_${i}`,
          act: 1,
          title: `Beat ${i}`,
          narrativeGuidance: {
            openingText: 'Some narrative content here.'
          },
          quickActions: [],
          objectives: [],
          exitConditions: []
        }))
      };

      const result = await validationService.validateStoryContent(easyStoryWithComplexity);

      const complexityIssue = result.issues.find(issue => issue.code === 'COMPLEXITY_DIFFICULTY_MISMATCH');
      expect(complexityIssue).toBeDefined();
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple stories', async () => {
      mockMetadataService.loadFullStory
        .mockResolvedValueOnce(validStory)
        .mockResolvedValueOnce(invalidStory)
        .mockResolvedValueOnce(null);

      const results = await validationService.validateMultipleStories(['story1', 'story2', 'story3']);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(false);
    });

    it('should handle errors in batch validation', async () => {
      mockMetadataService.loadFullStory
        .mockResolvedValueOnce(validStory)
        .mockRejectedValueOnce(new Error('Load failed'));

      const results = await validationService.validateMultipleStories(['story1', 'story2']);

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[1].issues[0].message).toContain('Load failed');
    });
  });

  describe('Custom Rules', () => {
    it('should support custom validation rules', async () => {
      const customRule: ValidationRule = {
        id: 'CUSTOM_RULE',
        name: 'Custom Test Rule',
        description: 'A custom rule for testing',
        category: 'content',
        severity: 'medium',
        check: (story: ByteboundGame) => {
          if (story.metadata.title.includes('Custom')) {
            return [{
              type: 'warning',
              category: 'content',
              severity: 'medium',
              code: 'CUSTOM_ISSUE',
              message: 'Custom rule triggered',
              location: 'metadata.title',
              suggestions: ['Fix custom issue']
            }];
          }
          return [];
        }
      };

      validationService.addCustomRule(customRule);

      const storyWithCustomIssue = {
        ...validStory,
        metadata: {
          ...validStory.metadata,
          title: 'Custom Story Title'
        }
      };

      const result = await validationService.validateStoryContent(storyWithCustomIssue);

      const customIssue = result.issues.find(issue => issue.code === 'CUSTOM_ISSUE');
      expect(customIssue).toBeDefined();
    });

    it('should remove custom rules', async () => {
      const customRule: ValidationRule = {
        id: 'REMOVABLE_RULE',
        name: 'Removable Rule',
        description: 'A rule that can be removed',
        category: 'content',
        severity: 'low',
        check: () => []
      };

      validationService.addCustomRule(customRule);
      expect(validationService.getAvailableRules()).toContain(customRule);

      validationService.removeCustomRule('REMOVABLE_RULE');
      expect(validationService.getAvailableRules()).not.toContain(customRule);
    });

    it('should handle custom rule execution errors', async () => {
      const faultyRule: ValidationRule = {
        id: 'FAULTY_RULE',
        name: 'Faulty Rule',
        description: 'A rule that throws an error',
        category: 'content',
        severity: 'low',
        check: () => {
          throw new Error('Rule execution failed');
        }
      };

      validationService.addCustomRule(faultyRule);

      const result = await validationService.validateStoryContent(validStory);

      const ruleError = result.issues.find(issue => issue.code === 'RULE_EXECUTION_ERROR');
      expect(ruleError).toBeDefined();
      expect(ruleError?.message).toContain('Faulty Rule');
    });
  });

  describe('Quality Scoring', () => {
    it('should calculate quality scores appropriately', async () => {
      const highQualityResult = await validationService.validateStoryContent(validStory);
      const lowQualityResult = await validationService.validateStoryContent(invalidStory);

      expect(highQualityResult.qualityScore).toBeGreaterThan(lowQualityResult.qualityScore);
      expect(highQualityResult.qualityScore).toBeGreaterThan(80);
      expect(lowQualityResult.qualityScore).toBeLessThan(50);
    });

    it('should provide meaningful recommendations', async () => {
      const result = await validationService.validateStoryContent(invalidStory);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('critical issues'))).toBe(true);
    });
  });

  describe('Service Management', () => {
    it('should provide service statistics', () => {
      const stats = validationService.getStats();

      expect(stats).toHaveProperty('totalRules');
      expect(stats).toHaveProperty('builtInRules');
      expect(stats).toHaveProperty('customRules');
      expect(stats).toHaveProperty('enabledFeatures');
      expect(stats.enabledFeatures.contentAnalysis).toBe(true);
      expect(stats.enabledFeatures.balanceChecking).toBe(true);
    });

    it('should list available validation rules', () => {
      const rules = validationService.getAvailableRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.id === 'REQUIRED_METADATA')).toBe(true);
      expect(rules.some(rule => rule.id === 'BEAT_CONNECTIVITY')).toBe(true);
    });
  });

  describe('Configuration Impact', () => {
    it('should respect configuration flags', async () => {
      const restrictedService = new StoryValidationService({
        metadataService: mockMetadataService,
        enableContentAnalysis: false,
        enableBalanceChecking: false,
        enableAccessibilityChecks: false,
        strictMode: false,
        customRules: []
      });

      const storyWithBalanceIssues = {
        ...validStory,
        hiddenMechanics: {
          playerStats: {},
          thresholds: {},
          relationships: {}
        }
      };

      const result = await restrictedService.validateStoryContent(storyWithBalanceIssues);

      // Should not include balance-related issues when balance checking is disabled
      const balanceIssues = result.issues.filter(issue => issue.category === 'balance');
      expect(balanceIssues.length).toBe(0);
    });
  });
});