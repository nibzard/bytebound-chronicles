/**
 * Unit tests for Hybrid Database Service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HybridDatabase, createHybridDatabase } from '../../../src/database/HybridDatabase.js';
import { PlayerInteraction, ActionResponse, ClientGameState, GameSave } from '../../../src/types/game.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, unlinkSync } from 'fs';

describe('HybridDatabase', () => {
  let db: HybridDatabase;
  let testDir: string;
  let testDbPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `hybrid-db-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    testDbPath = join(testDir, 'test.db');

    db = createHybridDatabase({
      lmdb: {
        config: {
          path: join(testDir, 'lmdb'),
          mapSize: 1024 * 1024 * 10, // 10MB
          maxDbs: 10,
          compression: true,
        },
        enableLogging: false,
      },
      sqlite: {
        config: {
          path: testDbPath,
          timeout: 5000,
        },
        enableWAL: true,
        enableForeignKeys: true,
        enableLogging: false,
      },
      enableLogging: false,
      syncInterval: 0, // Disable periodic sync for testing
      enableAutoCleanup: false,
    });

    await db.initialize();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(db.isInitialized()).toBe(true);
    });

    it('should perform health check', async () => {
      const health = await db.healthCheck();
      expect(health.overall).toBe(true);
      expect(health.lmdb).toBe(true);
      expect(health.sqlite).toBe(true);
      expect(health.errors).toHaveLength(0);
    });
  });

  describe('High-Frequency Operations (LMDB)', () => {
    it('should store and retrieve player interactions', async () => {
      const interaction: PlayerInteraction = {
        id: 'test-interaction-1',
        playerId: 'player-1',
        gameId: 'game-1',
        input: 'look around',
        response: 'You see a beautiful garden...',
        timestamp: Date.now(),
        beatId: 'beat-1',
        metadata: {
          processingTime: 200,
          confidence: 0.95,
          tokensUsed: 50,
          cost: 0.002,
          clientType: 'terminal',
        },
      };

      await db.storeInteraction(interaction);
      const history = await db.getInteractionHistory('game-1');

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(interaction);
    });

    it('should manage game sessions', async () => {
      const sessionData = {
        playerId: 'player-1',
        gameId: 'game-1',
        startedAt: new Date(),
      };

      await db.createSession('session-1', sessionData);
      const activeSessions = await db.getActiveSessions();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe('session-1');
    });

    it('should store and retrieve game state', async () => {
      const gameState: ClientGameState = {
        gameId: 'game-1',
        currentBeat: {
          id: 'beat-1',
          act: 1,
          title: 'Starting Point',
          description: 'The adventure begins...',
          setting: {
            location: 'tavern',
            timeOfDay: 'evening',
            atmosphere: 'cozy',
          },
          objectives: [],
          exitTransitions: [],
          aiGuidance: {
            tone: 'friendly',
            style: 'immersive',
            keyThemes: ['adventure'],
            avoidTopics: [],
          },
        },
        playerState: {
          health: 100,
          location: 'tavern',
          level: 1,
          inventory: [],
        },
        isConnected: true,
        lastUpdate: new Date(),
      };

      await db.storeGameState('game-1', gameState);
      const retrieved = await db.getGameState('game-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved!.gameId).toBe('game-1');
      expect(retrieved!.currentBeat.id).toBe('beat-1');
    });
  });

  describe('Structured Data Operations (SQLite)', () => {
    it('should manage player profiles', async () => {
      const profile = {
        id: 'player-1',
        username: 'testuser',
        email: 'test@example.com',
        preferences: { theme: 'dark' },
        achievements: ['first_login'],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      };

      await db.createPlayerProfile(profile);
      const retrieved = await db.getPlayerProfile('player-1');

      expect(retrieved).toBeTruthy();
      expect(retrieved.username).toBe('testuser');
      expect(retrieved.email).toBe('test@example.com');
    });

    it('should handle game saves', async () => {
      // First create a player profile
      await db.createPlayerProfile({
        id: 'player-1',
        username: 'testuser',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      });

      const gameSave: GameSave = {
        id: 'save-1',
        playerId: 'player-1',
        storyId: 'story-1',
        saveName: 'Quick Save',
        gameState: {
          location: 'forest',
          act: 1,
          completedObjectives: ['tutorial'],
          playerStats: {
            health: 100,
            maxHealth: 100,
            experience: 100,
            level: 1,
            attributes: {},
          },
          inventory: [],
          storyVariables: {},
          endings: {},
          characterRelationships: {},
        },
        currentBeatId: 'beat-3',
        createdAt: new Date(),
      };

      await db.saveGame(gameSave);
      const loaded = await db.loadGame('save-1');

      expect(loaded).toBeTruthy();
      expect(loaded!.id).toBe('save-1');
      expect(loaded!.saveName).toBe('Quick Save');
    });
  });

  describe('Advanced Operations', () => {
    beforeEach(async () => {
      // Set up test data
      await db.createPlayerProfile({
        id: 'player-1',
        username: 'testuser',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      });
    });

    it('should provide complete game session context', async () => {
      // Store interaction
      const interaction: PlayerInteraction = {
        id: 'interaction-1',
        playerId: 'player-1',
        gameId: 'game-1',
        input: 'examine surroundings',
        response: 'You notice...',
        timestamp: Date.now(),
        beatId: 'beat-1',
      };

      await db.storeInteraction(interaction);

      // Store response
      const response: ActionResponse = {
        response: 'The area is peaceful...',
        metadata: {
          model: 'gemini-2.0-flash-exp',
          escalated: false,
          confidence: 0.9,
          processingTime: 150,
          tokensUsed: 75,
          cost: 0.001,
        },
      };

      await db.storeResponse('interaction-1', response);

      // Store game state
      const gameState: ClientGameState = {
        gameId: 'game-1',
        currentBeat: {
          id: 'beat-1',
          act: 1,
          title: 'Forest Path',
          description: 'A winding path through the woods',
          setting: {
            location: 'forest',
            timeOfDay: 'afternoon',
            atmosphere: 'mysterious',
          },
          objectives: [],
          exitTransitions: [],
          aiGuidance: {
            tone: 'atmospheric',
            style: 'descriptive',
            keyThemes: ['nature', 'mystery'],
            avoidTopics: [],
          },
        },
        isConnected: true,
        lastUpdate: new Date(),
      };

      await db.storeGameState('game-1', gameState);

      // Get complete context
      const context = await db.getGameSessionContext('game-1');

      expect(context.gameState).toBeTruthy();
      expect(context.recentInteractions).toHaveLength(1);
      expect(context.recentResponses).toHaveLength(1);
      expect(context.recentInteractions[0].id).toBe('interaction-1');
    });

    it('should perform batch operations', async () => {
      const interactions: PlayerInteraction[] = [
        {
          id: 'batch-1',
          playerId: 'player-1',
          gameId: 'game-1',
          input: 'action 1',
          response: 'response 1',
          timestamp: Date.now(),
          beatId: 'beat-1',
        },
        {
          id: 'batch-2',
          playerId: 'player-1',
          gameId: 'game-1',
          input: 'action 2',
          response: 'response 2',
          timestamp: Date.now() + 1000,
          beatId: 'beat-1',
        },
      ];

      await db.batchStoreInteractions(interactions);
      const history = await db.getInteractionHistory('game-1');

      expect(history).toHaveLength(2);
    });
  });

  describe('Analytics and Monitoring', () => {
    beforeEach(async () => {
      await db.createPlayerProfile({
        id: 'player-1',
        username: 'testuser',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      });
    });

    it('should record analytics events', async () => {
      const analytics = {
        id: 'analytics-1',
        playerId: 'player-1',
        storyId: 'story-1',
        eventType: 'game_started',
        eventData: { startTime: Date.now() },
        sessionId: 'session-1',
      };

      await db.recordAnalytics(analytics);
      const retrieved = await db.getAnalytics({ playerId: 'player-1' });

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].eventType).toBe('game_started');
    });

    it('should get database statistics', async () => {
      const stats = await db.getStats();
      expect(stats).toBeTruthy();
      expect(stats.lmdb).toBeTruthy();
      expect(stats.sqlite).toBeTruthy();
    });
  });

  describe('Database Operations', () => {
    it('should handle save and delete operations', async () => {
      // Create player first
      await db.createPlayerProfile({
        id: 'player-1',
        username: 'testuser',
        preferences: {},
        achievements: [],
        totalPlayTime: 0,
        storiesPlayed: 0,
        storiesCompleted: 0,
      });

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

      await db.saveGame(gameSave);
      expect(await db.loadGame('save-to-delete')).toBeTruthy();

      const deleted = await db.deleteSave('save-to-delete');
      expect(deleted).toBe(true);
      expect(await db.loadGame('save-to-delete')).toBeNull();
    });

    it('should perform database maintenance', async () => {
      await expect(db.optimize()).resolves.not.toThrow();
      await expect(db.vacuum()).resolves.not.toThrow();
    });
  });

  describe('Transaction Support', () => {
    it('should support transactions', async () => {
      const result = await db.transaction(async (database) => {
        // In a real scenario, this would involve multiple operations
        await database.createPlayerProfile({
          id: 'tx-player',
          username: 'txuser',
          preferences: {},
          achievements: [],
          totalPlayTime: 0,
          storiesPlayed: 0,
          storiesCompleted: 0,
        });
        return 'transaction completed';
      });

      expect(result).toBe('transaction completed');
      const profile = await db.getPlayerProfile('tx-player');
      expect(profile).toBeTruthy();
    });

    it('should support SQLite transactions', () => {
      const result = db.sqliteTransaction(() => {
        return 'sqlite transaction completed';
      });

      expect(result).toBe('sqlite transaction completed');
    });
  });
});