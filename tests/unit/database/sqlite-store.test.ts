/**
 * Unit tests for SQLite Store
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteStore, createSQLiteStore } from '../../../src/database/SQLiteStore.js';
import { GameSave, StoryProgress, GameDifficulty } from '../../../src/types/game.js';
import { StoryMetadata } from '../../../src/types/story.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';

describe('SQLiteStore', () => {
  let store: SQLiteStore;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = join(tmpdir(), `test-${Date.now()}.db`);
    store = createSQLiteStore({
      config: {
        path: testDbPath,
        timeout: 5000,
      },
      enableWAL: true,
      enableForeignKeys: true,
      enableLogging: false,
    });
  });

  afterEach(() => {
    if (store) {
      store.close();
    }
    try {
      unlinkSync(testDbPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Player Profiles', () => {
    it('should create and retrieve player profiles', async () => {
      const profile = {
        id: 'player-1',
        username: 'testuser',
        email: 'test@example.com',
        preferences: { theme: 'dark', volume: 0.8 },
        achievements: ['first_game', 'explorer'],
        totalPlayTime: 3600,
        storiesPlayed: 3,
        storiesCompleted: 1,
      };

      await store.createPlayerProfile(profile);
      const retrieved = await store.getPlayerProfile('player-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved!.id).toBe(profile.id);
      expect(retrieved!.username).toBe(profile.username);
      expect(retrieved!.email).toBe(profile.email);
      expect(retrieved!.preferences).toEqual(profile.preferences);
      expect(retrieved!.achievements).toEqual(profile.achievements);
      expect(retrieved!.totalPlayTime).toBe(profile.totalPlayTime);
    });

    it('should update player profiles', async () => {
      const profile = {
        id: 'player-1',
        username: 'testuser',
        preferences: { theme: 'light' },
        achievements: ['first_game'],
        totalPlayTime: 1800,
        storiesPlayed: 1,
        storiesCompleted: 0,
      };

      await store.createPlayerProfile(profile);
      
      await store.updatePlayerProfile('player-1', {
        totalPlayTime: 3600,
        storiesCompleted: 1,
        achievements: ['first_game', 'story_master'],
      });

      const updated = await store.getPlayerProfile('player-1');
      expect(updated!.totalPlayTime).toBe(3600);
      expect(updated!.storiesCompleted).toBe(1);
      expect(updated!.achievements).toContain('story_master');
    });

    it('should return null for non-existent player', async () => {
      const profile = await store.getPlayerProfile('non-existent');
      expect(profile).toBeNull();
    });
  });

  describe('Game Saves', () => {
    beforeEach(async () => {
      // Create a player profile first due to foreign key constraint
      await store.createPlayerProfile({
        id: 'player-1',
        username: 'testuser',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      });
    });

    it('should save and load games', async () => {
      const gameSave: GameSave = {
        id: 'save-1',
        playerId: 'player-1',
        storyId: 'story-1',
        saveName: 'Chapter 1 Complete',
        gameState: {
          location: 'village',
          act: 1,
          completedObjectives: ['meet_elder'],
          playerStats: {
            health: 100,
            maxHealth: 100,
            experience: 250,
            level: 2,
            attributes: { strength: 10, wisdom: 8 },
          },
          inventory: [
            {
              id: 'sword-1',
              name: 'Iron Sword',
              description: 'A sturdy iron sword',
              quantity: 1,
              properties: ['weapon'],
            },
          ],
          storyVariables: { elderMet: true },
          endings: { good: 0.7, bad: 0.1 },
          characterRelationships: { elder: 5 },
        },
        currentBeatId: 'beat-5',
        createdAt: new Date(),
        description: 'Save after meeting the village elder',
      };

      await store.saveGame(gameSave);
      const loaded = await store.loadGame('save-1');

      expect(loaded).toBeTruthy();
      expect(loaded!.id).toBe(gameSave.id);
      expect(loaded!.saveName).toBe(gameSave.saveName);
      expect(loaded!.gameState).toEqual(gameSave.gameState);
      expect(loaded!.currentBeatId).toBe(gameSave.currentBeatId);
    });

    it('should get player saves', async () => {
      const saves: GameSave[] = [
        {
          id: 'save-1',
          playerId: 'player-1',
          storyId: 'story-1',
          saveName: 'Early Game',
          gameState: {
            location: 'start',
            act: 1,
            completedObjectives: [],
            playerStats: { health: 100, maxHealth: 100, experience: 0, level: 1, attributes: {} },
            inventory: [],
            storyVariables: {},
            endings: {},
            characterRelationships: {},
          },
          currentBeatId: 'beat-1',
          createdAt: new Date(Date.now() - 2000),
        },
        {
          id: 'save-2',
          playerId: 'player-1',
          storyId: 'story-1',
          saveName: 'Mid Game',
          gameState: {
            location: 'city',
            act: 2,
            completedObjectives: ['intro'],
            playerStats: { health: 100, maxHealth: 100, experience: 500, level: 3, attributes: {} },
            inventory: [],
            storyVariables: {},
            endings: {},
            characterRelationships: {},
          },
          currentBeatId: 'beat-10',
          createdAt: new Date(Date.now() - 500), // More recent than save-1
        },
      ];

      for (const save of saves) {
        await store.saveGame(save);
      }

      const playerSaves = await store.getPlayerSaves('player-1');
      expect(playerSaves).toHaveLength(2);
      
      // Should be ordered by creation date (newest first)
      expect(playerSaves[0].id).toBe('save-2'); // save-2 has newer timestamp (-500 vs -2000)
      expect(playerSaves[1].id).toBe('save-1');
    });

    it('should delete saves', async () => {
      const gameSave: GameSave = {
        id: 'save-to-delete',
        playerId: 'player-1',
        storyId: 'story-1',
        saveName: 'Temporary Save',
        gameState: {
          location: 'test',
          act: 1,
          completedObjectives: [],
          playerStats: { health: 100, maxHealth: 100, experience: 0, level: 1, attributes: {} },
          inventory: [],
          storyVariables: {},
          endings: {},
          characterRelationships: {},
        },
        currentBeatId: 'beat-1',
        createdAt: new Date(),
      };

      await store.saveGame(gameSave);
      expect(await store.loadGame('save-to-delete')).toBeTruthy();

      const deleted = await store.deleteSave('save-to-delete');
      expect(deleted).toBe(true);
      expect(await store.loadGame('save-to-delete')).toBeNull();
    });
  });

  describe('Story Progress', () => {
    beforeEach(async () => {
      await store.createPlayerProfile({
        id: 'player-1',
        username: 'testuser',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      });
    });

    it('should update and retrieve story progress', async () => {
      const progress: StoryProgress = {
        storyId: 'story-1',
        playerId: 'player-1',
        currentBeatId: 'beat-5',
        completedBeats: ['beat-1', 'beat-2', 'beat-3'],
        visitedLocations: ['village', 'forest', 'cave'],
        metCharacters: ['elder', 'merchant', 'guard'],
        discoveredSecrets: ['hidden_passage'],
        endingImplications: { good: 0.6, neutral: 0.3, bad: 0.1 },
        lastPlayed: new Date(),
        totalPlayTime: 2400, // 40 minutes
      };

      await store.updateStoryProgress(progress);
      const retrieved = await store.getStoryProgress('story-1', 'player-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved!.storyId).toBe(progress.storyId);
      expect(retrieved!.playerId).toBe(progress.playerId);
      expect(retrieved!.currentBeatId).toBe(progress.currentBeatId);
      expect(retrieved!.completedBeats).toEqual(progress.completedBeats);
      expect(retrieved!.visitedLocations).toEqual(progress.visitedLocations);
      expect(retrieved!.totalPlayTime).toBe(progress.totalPlayTime);
    });

    it('should return null for non-existent progress', async () => {
      const progress = await store.getStoryProgress('non-existent', 'player-1');
      expect(progress).toBeNull();
    });
  });

  describe('Story Metadata', () => {
    it('should store and retrieve story metadata', async () => {
      const metadata: StoryMetadata = {
        id: 'story-1',
        title: 'The Great Adventure',
        description: 'An epic tale of heroism and discovery',
        author: 'Test Author',
        version: '1.0.0',
        difficulty: GameDifficulty.INTERMEDIATE,
        estimatedLength: 90, // minutes
        tags: ['fantasy', 'adventure', 'heroic'],
        contentWarnings: ['mild violence'],
        minAge: 13,
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
        publicationStatus: 'published',
        rating: 4.5,
        playCount: 42,
      };

      await store.storeStoryMetadata(metadata);
      const retrieved = await store.getStoryMetadata('story-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved!.id).toBe(metadata.id);
      expect(retrieved!.title).toBe(metadata.title);
      expect(retrieved!.description).toBe(metadata.description);
      expect(retrieved!.difficulty).toBe(metadata.difficulty);
      expect(retrieved!.tags).toEqual(metadata.tags);
      expect(retrieved!.rating).toBe(metadata.rating);
    });
  });

  describe('Analytics', () => {
    beforeEach(async () => {
      await store.createPlayerProfile({
        id: 'player-1',
        username: 'testuser',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      });
    });

    it('should record and retrieve analytics', async () => {
      const analytics = {
        id: 'event-1',
        playerId: 'player-1',
        storyId: 'story-1',
        eventType: 'beat_completed',
        eventData: { beatId: 'beat-5', timeSpent: 180 },
        sessionId: 'session-1',
      };

      await store.recordAnalytics(analytics);
      const retrieved = await store.getAnalytics({ playerId: 'player-1' });

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(analytics.id);
      expect(retrieved[0].eventType).toBe(analytics.eventType);
      expect(retrieved[0].eventData).toEqual(analytics.eventData);
    });

    it('should filter analytics by multiple criteria', async () => {
      const events = [
        {
          id: 'event-1',
          playerId: 'player-1',
          storyId: 'story-1',
          eventType: 'game_started',
          eventData: {},
        },
        {
          id: 'event-2',
          playerId: 'player-1',
          storyId: 'story-2',
          eventType: 'game_started',
          eventData: {},
        },
        {
          id: 'event-3',
          playerId: 'player-1',
          storyId: 'story-1',
          eventType: 'beat_completed',
          eventData: { beatId: 'beat-1' },
        },
      ];

      for (const event of events) {
        await store.recordAnalytics(event);
      }

      // Filter by story and event type
      const filtered = await store.getAnalytics({
        storyId: 'story-1',
        eventType: 'beat_completed',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('event-3');
    });
  });

  describe('Database Maintenance', () => {
    it('should perform vacuum operation', async () => {
      // This is mainly to test that the operation doesn't throw
      await expect(store.vacuum()).resolves.not.toThrow();
    });

    it('should perform optimize operation', async () => {
      await expect(store.optimize()).resolves.not.toThrow();
    });

    it('should check if database is open', () => {
      expect(store.isOpen()).toBe(true);
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await store.createPlayerProfile({
        id: 'player-1',
        username: 'testuser',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      });
    });

    it('should execute successful transactions', () => {
      const result = store.transaction(() => {
        // This would normally involve multiple database operations
        return 'transaction completed';
      });

      expect(result).toBe('transaction completed');
    });
  });
});