// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Unit tests for StoryMetadataService
 * Tests story metadata loading, caching, filtering, and validation
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rmdir, rm } from 'fs/promises';
import { join } from 'path';
import { StoryMetadataService } from '../../../src/services/StoryMetadataService.js';
import { validateByteboundGame } from '../../../src/validation/game-schema-validator.js';

// Mock the validation function
vi.mock('../../../src/validation/game-schema-validator.js', () => ({
  validateByteboundGame: vi.fn()
}));

const mockedValidate = vi.mocked(validateByteboundGame);

describe('StoryMetadataService', () => {
  let service: StoryMetadataService;
  let testStoriesDir: string;

  beforeAll(async () => {
    // Create test directories
    testStoriesDir = join(process.cwd(), 'test-stories-temp');
    await mkdir(testStoriesDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directories
    await rm(testStoriesDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    service = new StoryMetadataService({
      storiesDirectory: testStoriesDir,
      enableCaching: true,
      cacheExpiryMinutes: 5,
      autoValidateStories: true
    });

    // Reset validation mock
    mockedValidate.mockClear();
    // Set default successful validation
    mockedValidate.mockImplementation((data: any) => {
      // Return the data as validated (passthrough)
      return data;
    });
  });

  afterEach(async () => {
    await service.clearCaches();
    
    // Clean up test files
    try {
      const files = await import('fs').then(fs => fs.promises.readdir(testStoriesDir));
      for (const file of files) {
        if (file.endsWith('.json')) {
          await rm(join(testStoriesDir, file));
        }
      }
    } catch {
      // Directory might be empty
    }
  });

  describe('Story Catalog Management', () => {
    it('should create empty catalog when no stories exist', async () => {
      const catalog = await service.getStoryCatalog();
      
      expect(catalog).toBeDefined();
      expect(catalog.stories).toHaveLength(0);
      expect(catalog.totalCount).toBe(0);
      expect(catalog.catalogVersion).toBe('1.0.0');
    });

    it('should load valid story files into catalog', async () => {
      const validStory = {
        metadata: {
          id: 'test-story-1',
          title: 'Test Adventure',
          description: 'A thrilling test adventure',
          author: 'Test Creator',
          version: '1.0.0',
          gameStyle: 'rpg-fantasy',
          difficulty: 'easy',
          estimatedLength: 90,
          tags: ['adventure', 'fantasy'],
          language: 'en'
        },
        hiddenMechanics: { playerStats: {}, thresholds: {}, relationships: {} },
        beats: [{ id: 'start', act: 1, title: 'Beginning' }],
        aiGuidance: { toneProgression: {}, narrativeStyle: {}, playerAgency: '' },
        functionCalls: []
      };

      await writeFile(
        join(testStoriesDir, 'test-story-1.json'),
        JSON.stringify(validStory, null, 2)
      );

      const catalog = await service.getStoryCatalog();
      
      expect(catalog.stories).toHaveLength(1);
      expect(catalog.totalCount).toBe(1);
      expect(catalog.stories[0].id).toBe('test-story-1');
      expect(catalog.stories[0].title).toBe('Test Adventure');
      expect(catalog.stories[0].available).toBe(true);
      expect(catalog.stories[0].validationStatus).toBe('valid');
    });

    it('should handle invalid story files gracefully', async () => {
      const invalidStory = {
        // Missing required metadata fields
        incomplete: 'data'
      };

      await writeFile(
        join(testStoriesDir, 'invalid-story.json'),
        JSON.stringify(invalidStory, null, 2)
      );

      // Clear the default mock and set up failure for this test
      mockedValidate.mockClear();
      mockedValidate.mockImplementation((data: any) => {
        if (data.incomplete === 'data') {
          throw new Error('Invalid story format');
        }
        return data;
      });

      const catalog = await service.getStoryCatalog();
      
      expect(catalog.stories).toHaveLength(1);
      expect(catalog.stories[0].id).toBe('invalid-story');
      expect(catalog.stories[0].available).toBe(false);
      expect(catalog.stories[0].validationStatus).toBe('invalid');
      expect(catalog.stories[0].validationErrors).toBeDefined();
      expect(catalog.stories[0].validationErrors![0]).toContain('Invalid story format');
    });

    it('should ignore non-JSON files and metadata.json', async () => {
      await writeFile(join(testStoriesDir, 'readme.txt'), 'Not a story file');
      await writeFile(join(testStoriesDir, 'metadata.json'), '{"catalog": "info"}');
      
      const validStory = {
        metadata: { id: 'valid', title: 'Valid Story', gameStyle: 'rpg-fantasy' },
        hiddenMechanics: { playerStats: {}, thresholds: {}, relationships: {} },
        beats: [],
        aiGuidance: { toneProgression: {}, narrativeStyle: {}, playerAgency: '' },
        functionCalls: []
      };
      
      await writeFile(
        join(testStoriesDir, 'valid-story.json'),
        JSON.stringify(validStory, null, 2)
      );

      const catalog = await service.getStoryCatalog();
      
      expect(catalog.stories).toHaveLength(1);
      expect(catalog.stories[0].id).toBe('valid');
    });
  });

  describe('Story Filtering', () => {
    beforeEach(async () => {
      const stories = [
        {
          metadata: {
            id: 'rpg-story',
            title: 'RPG Adventure',
            author: 'RPG Author',
            difficulty: 'medium',
            estimatedLength: 120,
            tags: ['rpg', 'fantasy'],
            language: 'en',
            rating: 4.5
          }
        },
        {
          metadata: {
            id: 'horror-story',
            title: 'Horror Tale',
            author: 'Horror Author',
            difficulty: 'hard',
            estimatedLength: 60,
            tags: ['horror', 'thriller'],
            language: 'en',
            rating: 4.0
          }
        },
        {
          metadata: {
            id: 'quick-story',
            title: 'Quick Adventure',
            author: 'Quick Author',
            difficulty: 'easy',
            estimatedLength: 30,
            tags: ['quick', 'casual'],
            language: 'es',
            rating: 3.5
          }
        }
      ];

      for (const story of stories) {
        const fullStory = {
          ...story,
          hiddenMechanics: { playerStats: {}, thresholds: {}, relationships: {} },
          beats: [],
          aiGuidance: { toneProgression: {}, narrativeStyle: {}, playerAgency: '' },
          functionCalls: []
        };
        
        await writeFile(
          join(testStoriesDir, `${story.metadata.id}.json`),
          JSON.stringify(fullStory, null, 2)
        );
      }
    });

    it('should filter by difficulty', async () => {
      const easyStories = await service.getFilteredStories({ difficulty: 'easy' });
      expect(easyStories).toHaveLength(1);
      expect(easyStories[0].id).toBe('quick-story');
    });

    it('should filter by tags', async () => {
      const fantasyStories = await service.getFilteredStories({ tags: ['fantasy'] });
      expect(fantasyStories).toHaveLength(1);
      expect(fantasyStories[0].id).toBe('rpg-story');
    });

    it('should filter by maximum length', async () => {
      const shortStories = await service.getFilteredStories({ maxLength: 90 });
      expect(shortStories).toHaveLength(2);
      expect(shortStories.map(s => s.id)).toContain('horror-story');
      expect(shortStories.map(s => s.id)).toContain('quick-story');
    });

    it('should filter by minimum rating', async () => {
      const highRatedStories = await service.getFilteredStories({ minRating: 4.0 });
      expect(highRatedStories).toHaveLength(2);
      expect(highRatedStories.map(s => s.id)).toContain('rpg-story');
      expect(highRatedStories.map(s => s.id)).toContain('horror-story');
    });

    it('should filter by language', async () => {
      const spanishStories = await service.getFilteredStories({ language: 'es' });
      expect(spanishStories).toHaveLength(1);
      expect(spanishStories[0].id).toBe('quick-story');
    });

    it('should filter by author', async () => {
      const rpgAuthorStories = await service.getFilteredStories({ author: 'RPG Author' });
      expect(rpgAuthorStories).toHaveLength(1);
      expect(rpgAuthorStories[0].id).toBe('rpg-story');
    });

    it('should combine multiple filters', async () => {
      const complexFilter = await service.getFilteredStories({
        difficulty: 'medium',
        tags: ['rpg'],
        maxLength: 150,
        minRating: 4.0
      });
      
      expect(complexFilter).toHaveLength(1);
      expect(complexFilter[0].id).toBe('rpg-story');
    });

    it('should return empty array when no stories match filters', async () => {
      const noMatches = await service.getFilteredStories({
        difficulty: 'nightmare' as any,
        minRating: 5.0
      });
      
      expect(noMatches).toHaveLength(0);
    });
  });

  describe('Individual Story Operations', () => {
    beforeEach(async () => {
      const testStory = {
        metadata: {
          id: 'individual-test',
          title: 'Individual Test Story',
          description: 'A story for individual testing',
          author: 'Test Author',
          version: '1.0.0',
          gameStyle: 'rpg-fantasy',
          difficulty: 'medium',
          estimatedLength: 75,
          tags: ['test', 'individual'],
          language: 'en'
        },
        hiddenMechanics: { 
          playerStats: { health: 100 }, 
          thresholds: { danger: 50 }, 
          relationships: {} 
        },
        beats: [
          { id: 'start', act: 1, title: 'Beginning' },
          { id: 'middle', act: 2, title: 'Middle' }
        ],
        aiGuidance: { 
          toneProgression: { act1: 'mysterious' }, 
          narrativeStyle: { perspective: 'second-person' }, 
          playerAgency: 'high' 
        },
        functionCalls: [
          { name: 'updateStats', description: 'Update player stats' }
        ]
      };

      await writeFile(
        join(testStoriesDir, 'individual-test.json'),
        JSON.stringify(testStory, null, 2)
      );
    });

    it('should get metadata for specific story', async () => {
      const metadata = await service.getStoryMetadata('individual-test');
      
      expect(metadata).toBeDefined();
      expect(metadata!.id).toBe('individual-test');
      expect(metadata!.title).toBe('Individual Test Story');
      expect(metadata!.available).toBe(true);
    });

    it('should return null for non-existent story', async () => {
      const metadata = await service.getStoryMetadata('non-existent');
      expect(metadata).toBeNull();
    });

    it('should check story availability', async () => {
      const available = await service.isStoryAvailable('individual-test');
      expect(available).toBe(true);

      const notAvailable = await service.isStoryAvailable('non-existent');
      expect(notAvailable).toBe(false);
    });

    it('should get story file path', async () => {
      const filePath = await service.getStoryFilePath('individual-test');
      expect(filePath).toBeDefined();
      expect(filePath).toContain('individual-test.json');
      
      const nullPath = await service.getStoryFilePath('non-existent');
      expect(nullPath).toBeNull();
    });

    it('should load full story content', async () => {
      // Set up mock to return the loaded data as-is
      mockedValidate.mockClear();
      mockedValidate.mockImplementation((data: any) => data);
      
      const fullStory = await service.loadFullStory('individual-test');
      
      expect(fullStory).toBeDefined();
      expect(fullStory!.metadata.id).toBe('individual-test');
      expect(fullStory!.beats).toHaveLength(2);
      expect(fullStory!.hiddenMechanics.playerStats.health).toBe(100);
    });

    it('should throw error when loading non-existent story', async () => {
      await expect(service.loadFullStory('non-existent')).rejects.toThrow('Story not found');
    });

    it('should cache loaded stories when caching enabled', async () => {
      // First, clear any existing cache and ensure fresh start
      await service.clearCaches();
      
      // Clear the mock to count calls accurately for just the loadFullStory calls
      mockedValidate.mockClear();
      mockedValidate.mockImplementation((data: any) => data);
      
      // Load story twice - the cache should prevent duplicate validation during loadFullStory
      const story1 = await service.loadFullStory('individual-test');
      
      // Clear mock again to only count the second call
      const callCountAfterFirst = mockedValidate.mock.calls.length;
      mockedValidate.mockClear();
      
      const story2 = await service.loadFullStory('individual-test');
      
      expect(story1).toBe(story2); // Should be same object reference (cached)
      expect(mockedValidate).toHaveBeenCalledTimes(0); // Second call should use cache, no validation
    });
  });

  describe('Caching Behavior', () => {
    it('should use cached catalog when valid', async () => {
      const testStory = {
        metadata: { id: 'cache-test', title: 'Cache Test' },
        hiddenMechanics: { playerStats: {}, thresholds: {}, relationships: {} },
        beats: [],
        aiGuidance: { toneProgression: {}, narrativeStyle: {}, playerAgency: '' },
        functionCalls: []
      };

      await writeFile(
        join(testStoriesDir, 'cache-test.json'),
        JSON.stringify(testStory, null, 2)
      );

      // First call should scan directory
      const catalog1 = await service.getStoryCatalog();
      
      // Second call should use cache
      const catalog2 = await service.getStoryCatalog();
      
      expect(catalog1).toBe(catalog2); // Should be same object reference
    });

    it('should refresh catalog when forced', async () => {
      const catalog1 = await service.getStoryCatalog();
      const catalog2 = await service.getStoryCatalog(true);
      
      expect(catalog1).not.toBe(catalog2); // Should be different objects
    });

    it('should clear all caches', async () => {
      await service.getStoryCatalog();
      
      const statsBefore = service.getStats();
      expect(statsBefore.catalogStories).toBeGreaterThanOrEqual(0);
      
      await service.clearCaches();
      
      const statsAfter = service.getStats();
      expect(statsAfter.cachedStories).toBe(0);
      expect(statsAfter.validationCacheSize).toBe(0);
    });
  });

  describe('Service Statistics', () => {
    it('should provide service statistics', async () => {
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('catalogStories');
      expect(stats).toHaveProperty('cachedStories');
      expect(stats).toHaveProperty('validationCacheSize');
      expect(stats).toHaveProperty('lastCatalogUpdate');
      expect(stats).toHaveProperty('cacheEnabled');
      expect(stats.cacheEnabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted JSON files', async () => {
      await writeFile(join(testStoriesDir, 'corrupted.json'), 'invalid json {');
      
      const catalog = await service.getStoryCatalog();
      const corruptedStory = catalog.stories.find(s => s.id === 'corrupted');
      
      expect(corruptedStory).toBeDefined();
      expect(corruptedStory!.available).toBe(false);
      expect(corruptedStory!.validationStatus).toBe('invalid');
    });

    it('should handle validation errors gracefully', async () => {
      const invalidStory = {
        metadata: { id: 'validation-error', title: 'Test' },
        hiddenMechanics: { playerStats: {}, thresholds: {}, relationships: {} },
        beats: [],
        aiGuidance: { toneProgression: {}, narrativeStyle: {}, playerAgency: '' },
        functionCalls: []
      };

      await writeFile(
        join(testStoriesDir, 'validation-error.json'),
        JSON.stringify(invalidStory, null, 2)
      );

      mockedValidate.mockImplementation(() => {
        throw new Error('Validation failed: missing required field');
      });

      const catalog = await service.getStoryCatalog();
      const errorStory = catalog.stories.find(s => s.id === 'validation-error');
      
      expect(errorStory).toBeDefined();
      expect(errorStory!.validationStatus).toBe('invalid');
      expect(errorStory!.validationErrors).toContain('Validation failed: missing required field');
    });
  });
});