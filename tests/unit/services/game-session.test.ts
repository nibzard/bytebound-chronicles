// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Unit tests for GameSessionService
 * Tests session management, player actions, state persistence, and real-time updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameSessionService, type GameSession, type SessionAction } from '../../../src/services/GameSessionService.js';
import { StoryMetadataService } from '../../../src/services/StoryMetadataService.js';
import { ProgressiveStoryLoader } from '../../../src/services/ProgressiveStoryLoader.js';
import { StoryValidationService } from '../../../src/services/StoryValidationService.js';
import { HybridDatabase } from '../../../src/database/HybridDatabase.js';

// Create mock implementations
const mockMetadataService = {
  getStoryMetadata: vi.fn(),
  loadFullStory: vi.fn()
} as any;

const mockStoryLoader = {
  initializeStory: vi.fn(),
  loadStorySession: vi.fn(),
  updateStoryProgress: vi.fn()
} as any;

const mockValidationService = {
  validateStory: vi.fn()
} as any;

const mockDatabase = {
  storeInteraction: vi.fn(),
  storeResponse: vi.fn(),
  saveGame: vi.fn()
} as any;

describe('GameSessionService', () => {
  let sessionService: GameSessionService;
  let mockStoryMetadata: any;
  let mockStoryContent: any;
  let mockValidationResult: any;

  beforeEach(() => {
    sessionService = new GameSessionService({
      metadataService: mockMetadataService,
      storyLoader: mockStoryLoader,
      validationService: mockValidationService,
      database: mockDatabase,
      sessionTimeout: 30, // 30 minutes
      autoSaveInterval: 5, // 5 minutes
      maxConcurrentSessions: 3,
      enableRealTimeUpdates: true,
      aiResponseTimeout: 30 // 30 seconds
    });

    // Mock story metadata
    mockStoryMetadata = {
      id: 'test-story',
      title: 'Test Adventure',
      description: 'A test story for session management',
      difficulty: 'medium',
      available: true,
      estimatedLength: 120
    };

    // Mock story content
    mockStoryContent = {
      metadata: mockStoryMetadata,
      currentBeat: {
        id: 'start',
        act: 1,
        title: 'Beginning',
        narrativeGuidance: {
          openingText: 'Your adventure begins...'
        },
        quickActions: [
          {
            id: 'explore',
            label: 'Explore the area',
            description: 'Look around for clues',
            icon: '🔍'
          },
          {
            id: 'talk',
            label: 'Talk to locals',
            description: 'Gather information',
            icon: '💬'
          }
        ]
      },
      progressState: {
        storyId: 'test-story',
        playerId: 'player1',
        currentBeatId: 'start',
        accessibleBeats: ['start'],
        revealedCharacters: [],
        discoveredItems: [],
        unlockedEndings: [],
        hiddenMechanicsState: { health: 100, reputation: 0 },
        relationshipsState: { companion: 0 },
        gameFlags: {},
        lastUpdated: new Date()
      }
    };

    // Mock validation result
    mockValidationResult = {
      valid: true,
      storyId: 'test-story',
      validatedAt: new Date(),
      issues: [],
      summary: { errors: 0, warnings: 0, infos: 0, criticalIssues: 0 },
      qualityScore: 95
    };

    // Reset all mocks
    mockMetadataService.getStoryMetadata.mockClear();
    mockMetadataService.loadFullStory.mockClear();
    mockStoryLoader.initializeStory.mockClear();
    mockStoryLoader.loadStorySession.mockClear();
    mockStoryLoader.updateStoryProgress.mockClear();
    mockValidationService.validateStory.mockClear();
    mockDatabase.storeInteraction.mockClear();
    mockDatabase.storeResponse.mockClear();
    mockDatabase.saveGame.mockClear();
  });

  afterEach(() => {
    // Clean up any active sessions and timers
    vi.clearAllTimers();
  });

  describe('Session Creation', () => {
    it('should create a new game session successfully', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      const session = await sessionService.createSession('player1', 'test-story');

      expect(session).toBeDefined();
      expect(session.playerId).toBe('player1');
      expect(session.storyId).toBe('test-story');
      expect(session.status).toBe('active');
      expect(session.currentBeatId).toBe('start');
      expect(session.settings.difficulty).toBe('medium');
      expect(typeof session.sessionData.statistics.sessionStarted).toBe('number');

      expect(mockMetadataService.getStoryMetadata).toHaveBeenCalledWith('test-story');
      expect(mockValidationService.validateStory).toHaveBeenCalledWith('test-story');
      expect(mockStoryLoader.initializeStory).toHaveBeenCalledWith('test-story', 'player1');
    });

    it('should throw error for unavailable story', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue({
        ...mockStoryMetadata,
        available: false
      });

      await expect(sessionService.createSession('player1', 'test-story'))
        .rejects.toThrow('Story test-story is not available');
    });

    it('should throw error for invalid story', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue({
        ...mockValidationResult,
        valid: false
      });

      await expect(sessionService.createSession('player1', 'test-story'))
        .rejects.toThrow('Story test-story has validation errors');
    });

    it('should throw error when concurrent session limit exceeded', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      // Create 3 sessions (max limit)
      await sessionService.createSession('player1', 'test-story');
      await sessionService.createSession('player1', 'test-story-2');
      await sessionService.createSession('player1', 'test-story-3');

      // Fourth session should fail
      await expect(sessionService.createSession('player1', 'test-story-4'))
        .rejects.toThrow('Player player1 has reached the maximum number of concurrent sessions');
    });

    it('should apply custom session settings', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      const customSettings = {
        autoSave: false,
        hints: false,
        fastMode: true,
        narrativeVerbosity: 'verbose' as const
      };

      const session = await sessionService.createSession('player1', 'test-story', customSettings);

      expect(session.settings.autoSave).toBe(false);
      expect(session.settings.hints).toBe(false);
      expect(session.settings.fastMode).toBe(true);
      expect(session.settings.narrativeVerbosity).toBe('verbose');
    });
  });

  describe('Session Loading', () => {
    let existingSession: GameSession;

    beforeEach(async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      existingSession = await sessionService.createSession('player1', 'test-story');
    });

    it('should load existing active session', async () => {
      const loadedSession = await sessionService.loadSession(existingSession.id, 'player1');

      expect(loadedSession.id).toBe(existingSession.id);
      expect(loadedSession.status).toBe('active');
      expect(loadedSession.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should deny access to session for wrong player', async () => {
      await expect(sessionService.loadSession(existingSession.id, 'different-player'))
        .rejects.toThrow('Access denied to session');
    });

    it('should throw error for non-existent session', async () => {
      await expect(sessionService.loadSession('non-existent-session', 'player1'))
        .rejects.toThrow('Session non-existent-session not found');
    });
  });

  describe('Action Processing', () => {
    let session: GameSession;

    beforeEach(async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      session = await sessionService.createSession('player1', 'test-story');
      
      // Mock story loader update response
      mockStoryLoader.updateStoryProgress.mockResolvedValue({
        ...mockStoryContent,
        currentBeat: {
          ...mockStoryContent.currentBeat,
          narrativeGuidance: {
            openingText: 'You explored the area and found some interesting clues...'
          }
        }
      });
    });

    it('should process quick action successfully', async () => {
      const action: SessionAction = {
        sessionId: session.id,
        playerId: 'player1',
        type: 'quick_action',
        data: {
          actionId: 'explore',
          beatId: 'start',
          timestamp: new Date(),
          metadata: {
            statChanges: { reputation: 5 }
          }
        }
      };

      const response = await sessionService.processAction(action);

      expect(response).toBeDefined();
      expect(response.response).toContain('explored');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBe('game-engine');
      expect(response.gameState).toBeDefined();

      expect(mockDatabase.storeInteraction).toHaveBeenCalled();
      expect(mockDatabase.storeResponse).toHaveBeenCalled();
      expect(mockStoryLoader.updateStoryProgress).toHaveBeenCalled();
    });

    it('should process custom input action', async () => {
      const action: SessionAction = {
        sessionId: session.id,
        playerId: 'player1',
        type: 'custom_input',
        data: {
          customText: 'I want to examine the mysterious door',
          beatId: 'start',
          timestamp: new Date()
        }
      };

      const response = await sessionService.processAction(action);

      expect(response.response).toContain('I want to examine the mysterious door');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBe('ai-orchestrator');
      expect(response.metadata.suggestions).toBeDefined();
    });

    it('should process system action', async () => {
      const action: SessionAction = {
        sessionId: session.id,
        playerId: 'player1',
        type: 'system_action',
        data: {
          beatId: 'start',
          timestamp: new Date()
        }
      };

      const response = await sessionService.processAction(action);

      expect(response.response).toBe('System action processed.');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBe('system');
    });

    it('should update session statistics after action', async () => {
      const initialActions = session.sessionData.statistics.actionsPerformed;

      const action: SessionAction = {
        sessionId: session.id,
        playerId: 'player1',
        type: 'quick_action',
        data: {
          actionId: 'explore',
          beatId: 'start',
          timestamp: new Date()
        }
      };

      await sessionService.processAction(action);

      const updatedSession = await sessionService.loadSession(session.id, 'player1');
      expect(updatedSession.sessionData.statistics.actionsPerformed).toBe(initialActions + 1);
      expect(updatedSession.sessionData.statistics.choicesMade).toBe(1);
    });

    it('should deny action for inactive session', async () => {
      await sessionService.pauseSession(session.id, 'player1');

      const action: SessionAction = {
        sessionId: session.id,
        playerId: 'player1',
        type: 'quick_action',
        data: {
          actionId: 'explore',
          beatId: 'start',
          timestamp: new Date()
        }
      };

      await expect(sessionService.processAction(action))
        .rejects.toThrow('Session ' + session.id + ' is not active');
    });

    it('should deny action for wrong player', async () => {
      const action: SessionAction = {
        sessionId: session.id,
        playerId: 'different-player',
        type: 'quick_action',
        data: {
          actionId: 'explore',
          beatId: 'start',
          timestamp: new Date()
        }
      };

      await expect(sessionService.processAction(action))
        .rejects.toThrow('Access denied to session');
    });

    it('should handle action processing errors gracefully', async () => {
      mockStoryLoader.updateStoryProgress.mockRejectedValue(new Error('Story update failed'));

      const action: SessionAction = {
        sessionId: session.id,
        playerId: 'player1',
        type: 'quick_action',
        data: {
          actionId: 'explore',
          beatId: 'start',
          timestamp: new Date()
        }
      };

      await expect(sessionService.processAction(action))
        .rejects.toThrow('Story update failed');

      // Should still store error response
      expect(mockDatabase.storeResponse).toHaveBeenCalled();
    });
  });

  describe('Session State Management', () => {
    let session: GameSession;

    beforeEach(async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      session = await sessionService.createSession('player1', 'test-story');
    });

    it('should get current session state', async () => {
      mockStoryLoader.loadStorySession.mockResolvedValue(mockStoryContent);

      const gameState = await sessionService.getSessionState(session.id, 'player1');

      expect(gameState.gameId).toBe(session.id);
      expect(gameState.currentBeat).toBeDefined();
      expect(gameState.currentBeat.title).toBe('Beginning');
      expect(gameState.isConnected).toBe(true);
      expect(gameState.playerState).toBeDefined();
      expect(gameState.playerState?.health).toBe(100);

      expect(mockStoryLoader.loadStorySession).toHaveBeenCalledWith('test-story', 'player1');
    });

    it('should deny state access for wrong player', async () => {
      await expect(sessionService.getSessionState(session.id, 'different-player'))
        .rejects.toThrow('Session ' + session.id + ' not found or access denied');
    });

    it('should pause session', async () => {
      await sessionService.pauseSession(session.id, 'player1');

      const updatedSession = await sessionService.loadSession(session.id, 'player1');
      expect(updatedSession.status).toBe('paused');
    });

    it('should resume paused session', async () => {
      await sessionService.pauseSession(session.id, 'player1');
      await sessionService.resumeSession(session.id, 'player1');

      const updatedSession = await sessionService.loadSession(session.id, 'player1');
      expect(updatedSession.status).toBe('active');
      expect(updatedSession.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should not resume non-paused session', async () => {
      await expect(sessionService.resumeSession(session.id, 'player1'))
        .rejects.toThrow('Session ' + session.id + ' is not paused');
    });

    it('should end session with completion', async () => {
      await sessionService.endSession(session.id, 'player1', 'completed');

      await expect(sessionService.loadSession(session.id, 'player1'))
        .rejects.toThrow('Session ' + session.id + ' not found');
    });

    it('should end session with abandonment', async () => {
      await sessionService.endSession(session.id, 'player1', 'abandoned');

      await expect(sessionService.loadSession(session.id, 'player1'))
        .rejects.toThrow('Session ' + session.id + ' not found');
    });
  });

  describe('Game Saving', () => {
    let session: GameSession;

    beforeEach(async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      session = await sessionService.createSession('player1', 'test-story');
    });

    it('should save game successfully', async () => {
      mockDatabase.saveGame.mockResolvedValue(undefined);

      const gameSave = await sessionService.saveGame(session.id, 'player1', 'My Save', 'Important checkpoint');

      expect(gameSave).toBeDefined();
      expect(gameSave.playerId).toBe('player1');
      expect(gameSave.storyId).toBe('test-story');
      expect(gameSave.saveName).toBe('My Save');
      expect(gameSave.description).toBe('Important checkpoint');
      expect(gameSave.currentBeatId).toBe('start');
      expect(gameSave.gameState).toBeDefined();

      expect(mockDatabase.saveGame).toHaveBeenCalledWith(gameSave);
    });

    it('should deny save for wrong player', async () => {
      await expect(sessionService.saveGame(session.id, 'different-player', 'My Save'))
        .rejects.toThrow('Session ' + session.id + ' not found or access denied');
    });
  });

  describe('Player Session Management', () => {
    it('should get player sessions', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      const session1 = await sessionService.createSession('player1', 'test-story');
      const session2 = await sessionService.createSession('player1', 'test-story-2');
      await sessionService.createSession('player2', 'test-story'); // Different player

      const playerSessions = await sessionService.getPlayerSessions('player1');

      expect(playerSessions).toHaveLength(2);
      expect(playerSessions.map(s => s.id)).toContain(session1.id);
      expect(playerSessions.map(s => s.id)).toContain(session2.id);
    });

    it('should get only active sessions by default', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      const session1 = await sessionService.createSession('player1', 'test-story');
      const session2 = await sessionService.createSession('player1', 'test-story-2');
      
      await sessionService.pauseSession(session2.id, 'player1');

      const activeSessions = await sessionService.getPlayerSessions('player1');
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe(session1.id);

      const allSessions = await sessionService.getPlayerSessions('player1', true);
      expect(allSessions).toHaveLength(2);
    });
  });

  describe('Real-time Updates', () => {
    let session: GameSession;

    beforeEach(async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      session = await sessionService.createSession('player1', 'test-story');
    });

    it('should allow subscription to session updates', () => {
      const updateCallback = vi.fn();
      const unsubscribe = sessionService.subscribeToUpdates(session.id, updateCallback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should notify subscribers of session updates', async () => {
      const updateCallback = vi.fn();
      sessionService.subscribeToUpdates(session.id, updateCallback);

      await sessionService.pauseSession(session.id, 'player1');

      expect(updateCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: session.id,
          updateType: 'status_change',
          data: { status: 'paused' }
        })
      );
    });

    it('should allow unsubscription from updates', () => {
      const updateCallback = vi.fn();
      const unsubscribe = sessionService.subscribeToUpdates(session.id, updateCallback);

      unsubscribe();

      // Callback should not be called after unsubscription
      // This would be tested by triggering an update and ensuring callback isn't called
    });

    it('should handle subscriber errors gracefully', async () => {
      const faultyCallback = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });
      
      sessionService.subscribeToUpdates(session.id, faultyCallback);

      // Should not throw error when notifying faulty subscriber
      await expect(sessionService.pauseSession(session.id, 'player1'))
        .resolves.not.toThrow();
    });
  });

  describe('Service Statistics', () => {
    it('should provide service statistics', async () => {
      const stats = sessionService.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalActiveSessions).toBe(0);
      expect(stats.activeSessionsCount).toBe(0);
      expect(stats.pausedSessionsCount).toBe(0);
      expect(stats.configuredLimits).toBeDefined();
      expect(stats.configuredLimits.sessionTimeout).toBe(30);
      expect(stats.configuredLimits.maxConcurrentSessions).toBe(3);
      expect(stats.configuredLimits.autoSaveInterval).toBe(5);
    });

    it('should update statistics with active sessions', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      const session1 = await sessionService.createSession('player1', 'test-story');
      const session2 = await sessionService.createSession('player1', 'test-story-2');
      await sessionService.pauseSession(session2.id, 'player1');

      const stats = sessionService.getStats();

      expect(stats.totalActiveSessions).toBe(2);
      expect(stats.activeSessionsCount).toBe(1);
      expect(stats.pausedSessionsCount).toBe(1);
    });
  });

  describe('Session Cleanup', () => {
    it('should cleanup inactive sessions', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);

      const session = await sessionService.createSession('player1', 'test-story');

      // Manually set lastActiveAt to old time to simulate timeout
      const loadedSession = await sessionService.loadSession(session.id, 'player1');
      loadedSession.lastActiveAt = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago

      await sessionService.cleanup();

      // Session should be ended due to timeout
      await expect(sessionService.loadSession(session.id, 'player1'))
        .rejects.toThrow('Session ' + session.id + ' not found');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing story metadata', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(null);

      await expect(sessionService.createSession('player1', 'non-existent-story'))
        .rejects.toThrow('Story non-existent-story is not available');
    });

    it('should handle story initialization failure', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockRejectedValue(new Error('Story initialization failed'));

      await expect(sessionService.createSession('player1', 'test-story'))
        .rejects.toThrow('Story initialization failed');
    });

    it('should handle validation service failure', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockRejectedValue(new Error('Validation failed'));

      await expect(sessionService.createSession('player1', 'test-story'))
        .rejects.toThrow('Validation failed');
    });

    it('should handle database interaction failures', async () => {
      mockMetadataService.getStoryMetadata.mockResolvedValue(mockStoryMetadata);
      mockValidationService.validateStory.mockResolvedValue(mockValidationResult);
      mockStoryLoader.initializeStory.mockResolvedValue(mockStoryContent);
      mockStoryLoader.updateStoryProgress.mockResolvedValue(mockStoryContent);

      const session = await sessionService.createSession('player1', 'test-story');

      mockDatabase.storeInteraction.mockRejectedValue(new Error('Database error'));

      const action: SessionAction = {
        sessionId: session.id,
        playerId: 'player1',
        type: 'quick_action',
        data: {
          actionId: 'explore',
          beatId: 'start',
          timestamp: new Date()
        }
      };

      await expect(sessionService.processAction(action))
        .rejects.toThrow('Database error');
    });
  });
});