/**
 * Unit tests for LMDB Store
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LMDBStore, createLMDBStore } from '../../../src/database/LMDBStore.js';
import { PlayerInteraction, ActionResponse, ClientGameState } from '../../../src/types/game.js';
import { AIModelUsage } from '../../../src/types/ai.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

describe('LMDBStore', () => {
  let store: LMDBStore;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `lmdb-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    store = createLMDBStore({
      config: {
        path: testDir,
        mapSize: 1024 * 1024 * 10, // 10MB for testing
        maxDbs: 10,
        compression: true,
      },
      enableLogging: false,
    });
  });

  afterEach(async () => {
    if (store) {
      await store.close();
    }
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  describe('Player Interactions', () => {
    it('should store and retrieve player interactions', async () => {
      const interaction: PlayerInteraction = {
        id: 'test-interaction-1',
        playerId: 'player-1',
        gameId: 'game-1',
        input: 'examine room',
        response: 'You look around the room...',
        timestamp: Date.now(),
        beatId: 'beat-1',
        metadata: {
          processingTime: 150,
          confidence: 0.95,
          tokensUsed: 42,
          cost: 0.001,
          clientType: 'terminal',
        },
      };

      await store.storeInteraction(interaction);
      const history = await store.getInteractionHistory('game-1', 10);

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(interaction);
    });

    it('should retrieve interaction history with pagination', async () => {
      const interactions: PlayerInteraction[] = [];
      for (let i = 0; i < 15; i++) {
        interactions.push({
          id: `interaction-${i}`,
          playerId: 'player-1',
          gameId: 'game-1',
          input: `action ${i}`,
          response: `response ${i}`,
          timestamp: Date.now() + i,
          beatId: 'beat-1',
        });
      }

      // Store all interactions
      for (const interaction of interactions) {
        await store.storeInteraction(interaction);
      }

      // Test pagination
      const firstPage = await store.getInteractionHistory('game-1', 5, 0);
      const secondPage = await store.getInteractionHistory('game-1', 5, 5);

      expect(firstPage).toHaveLength(5);
      expect(secondPage).toHaveLength(5);
      
      // Should be in reverse chronological order (newest first)
      expect(firstPage[0].timestamp).toBeGreaterThan(firstPage[1].timestamp);
    });

    it('should get the last interaction', async () => {
      const interaction1: PlayerInteraction = {
        id: 'interaction-1',
        playerId: 'player-1',
        gameId: 'game-1',
        input: 'first action',
        response: 'first response',
        timestamp: Date.now(),
        beatId: 'beat-1',
      };

      const interaction2: PlayerInteraction = {
        id: 'interaction-2',
        playerId: 'player-1',
        gameId: 'game-1',
        input: 'second action',
        response: 'second response',
        timestamp: Date.now() + 1000,
        beatId: 'beat-1',
      };

      await store.storeInteraction(interaction1);
      await store.storeInteraction(interaction2);

      const lastInteraction = await store.getLastInteraction('game-1');
      expect(lastInteraction).toEqual(interaction2);
    });
  });

  describe('AI Responses', () => {
    it('should store and retrieve AI responses', async () => {
      const response: ActionResponse = {
        response: 'You examine the ancient tome...',
        gameState: {
          location: 'library',
          act: 1,
          completedObjectives: ['find_book'],
          playerStats: { health: 100, maxHealth: 100, experience: 0, level: 1, attributes: {} },
          inventory: [],
          storyVariables: {},
          endings: {},
          characterRelationships: {},
        },
        choices: ['Read the book', 'Put it back', 'Take it with you'],
        metadata: {
          model: 'gemini-2.0-flash-exp',
          escalated: false,
          confidence: 0.92,
          processingTime: 250,
          tokensUsed: 128,
          cost: 0.003,
        },
      };

      await store.storeResponse('interaction-1', response);
      const retrieved = await store.getResponse('interaction-1');

      expect(retrieved).toEqual(response);
    });

    it('should handle non-existent responses', async () => {
      const response = await store.getResponse('non-existent');
      expect(response).toBeNull();
    });
  });

  describe('Game State', () => {
    it('should store and retrieve game state', async () => {
      const gameState: ClientGameState = {
        gameId: 'game-1',
        currentBeat: {
          id: 'beat-1',
          act: 1,
          title: 'The Beginning',
          description: 'You start your journey...',
          setting: {
            location: 'village',
            timeOfDay: 'morning',
            atmosphere: 'peaceful',
          },
          objectives: [],
          exitTransitions: [],
          aiGuidance: {
            tone: 'friendly',
            style: 'descriptive',
            keyThemes: ['adventure'],
            avoidTopics: [],
          },
        },
        playerState: {
          health: 100,
          location: 'village',
          level: 1,
          inventory: [],
        },
        isConnected: true,
        lastUpdate: new Date(),
      };

      await store.storeGameState('game-1', gameState);
      const retrieved = await store.getGameState('game-1');

      expect(retrieved).toEqual(expect.objectContaining({
        gameId: gameState.gameId,
        currentBeat: gameState.currentBeat,
        playerState: gameState.playerState,
        isConnected: gameState.isConnected,
      }));
    });

    it('should delete game state', async () => {
      const gameState: ClientGameState = {
        gameId: 'game-1',
        currentBeat: {} as any,
        isConnected: true,
        lastUpdate: new Date(),
      };

      await store.storeGameState('game-1', gameState);
      expect(await store.getGameState('game-1')).not.toBeNull();

      const deleted = await store.deleteGameState('game-1');
      expect(deleted).toBe(true);
      expect(await store.getGameState('game-1')).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should create and manage sessions', async () => {
      const sessionData = {
        playerId: 'player-1',
        gameId: 'game-1',
        startedAt: new Date(),
      };

      await store.createSession('session-1', sessionData);
      const activeSessions = await store.getActiveSessions();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe('session-1');
      expect(activeSessions[0].data.playerId).toBe('player-1');
    });

    it('should update session activity', async () => {
      const sessionData = {
        playerId: 'player-1',
        gameId: 'game-1',
        startedAt: new Date(),
      };

      await store.createSession('session-1', sessionData);
      await store.updateSessionActivity('session-1');

      const sessions = await store.getActiveSessions();
      expect(sessions).toHaveLength(1);
    });

    it('should end sessions', async () => {
      const sessionData = {
        playerId: 'player-1',
        gameId: 'game-1',
        startedAt: new Date(),
      };

      await store.createSession('session-1', sessionData);
      await store.endSession('session-1');

      const activeSessions = await store.getActiveSessions();
      expect(activeSessions).toHaveLength(0);
    });
  });

  describe('AI Metrics', () => {
    it('should record and retrieve AI metrics', async () => {
      const usage: AIModelUsage = {
        model: 'gemini-2.0-flash-exp',
        taskType: 'narrative_generation',
        timestamp: Date.now(),
        tokensUsed: 256,
        cost: 0.005,
        responseTime: 300,
        successful: true,
        escalated: false,
      };

      await store.recordAIUsage(usage);
      const metrics = await store.getAIMetrics('gemini-2.0-flash-exp');

      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(usage);
    });

    it('should filter metrics by time range', async () => {
      const now = Date.now();
      const usage1: AIModelUsage = {
        model: 'gemini-2.0-flash-exp',
        taskType: 'narrative_generation',
        timestamp: now - 1000,
        tokensUsed: 100,
        cost: 0.001,
        responseTime: 200,
        successful: true,
        escalated: false,
      };

      const usage2: AIModelUsage = {
        model: 'gemini-2.0-flash-exp',
        taskType: 'narrative_generation',
        timestamp: now + 1000,
        tokensUsed: 200,
        cost: 0.002,
        responseTime: 250,
        successful: true,
        escalated: false,
      };

      await store.recordAIUsage(usage1);
      await store.recordAIUsage(usage2);

      const metrics = await store.getAIMetrics('gemini-2.0-flash-exp', {
        start: new Date(now - 500),
        end: new Date(now + 500),
      });

      expect(metrics).toHaveLength(0); // Neither should be in this range
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch operations', async () => {
      const operations = [
        {
          type: 'interaction' as const,
          key: 'game-1:1000',
          data: {
            id: 'interaction-1',
            playerId: 'player-1',
            gameId: 'game-1',
            input: 'test',
            response: 'test response',
            timestamp: 1000,
            beatId: 'beat-1',
          },
        },
        {
          type: 'interaction' as const,
          key: 'game-1:2000',
          data: {
            id: 'interaction-2',
            playerId: 'player-1',
            gameId: 'game-1',
            input: 'test 2',
            response: 'test response 2',
            timestamp: 2000,
            beatId: 'beat-1',
          },
        },
      ];

      await store.batchStore(operations);
      const history = await store.getInteractionHistory('game-1');

      expect(history).toHaveLength(2);
    });
  });

  describe('Maintenance Operations', () => {
    it('should get store statistics', async () => {
      // Store some test data
      await store.storeInteraction({
        id: 'test-interaction',
        playerId: 'player-1',
        gameId: 'game-1',
        input: 'test',
        response: 'test response',
        timestamp: Date.now(),
        beatId: 'beat-1',
      });

      const stats = await store.getStats();
      expect(stats.interactions).toBe(1);
      expect(stats.responses).toBe(0);
      expect(stats.gameStates).toBe(0);
      expect(stats.sessions).toBe(0);
      expect(stats.aiMetrics).toBe(0);
    });

    it('should check connection status', () => {
      expect(store.isConnected()).toBe(true);
    });
  });
});