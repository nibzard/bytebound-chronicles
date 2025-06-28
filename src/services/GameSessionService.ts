// Copyright (c) 2025 Nikola Balic
// MIT License

/**
 * Game Session Service
 * Manages game sessions, coordinates player interactions with stories and AI
 * Provides session lifecycle management, state persistence, and real-time updates
 */

import { v4 as uuidv4 } from 'uuid';
import { StoryMetadataService } from './StoryMetadataService.js';
import { ProgressiveStoryLoader } from './ProgressiveStoryLoader.js';
import { StoryValidationService } from './StoryValidationService.js';
import { HybridDatabase } from '../database/HybridDatabase.js';
import { PlayerInteraction, ActionResponse, ClientGameState, GameSave, StoryBeat, PlayerStats } from '../types/game.js';

export interface GameSession {
  id: string;
  playerId: string;
  storyId: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  createdAt: Date;
  lastActiveAt: Date;
  currentBeatId: string;
  sessionData: {
    playerChoices: Array<{
      beatId: string;
      actionId: string;
      timestamp: Date;
      effects: Record<string, any>;
    }>;
    storyProgress: Record<string, any>;
    aiContext: {
      conversationHistory: Array<{
        type: 'player' | 'ai';
        content: string;
        timestamp: Date;
        metadata?: Record<string, any>;
      }>;
      playerMood: 'curious' | 'impatient' | 'engaged' | 'frustrated' | 'confused';
      narrativeStyle: 'descriptive' | 'action_focused' | 'dialogue_heavy' | 'atmospheric';
      lastAIResponse?: ActionResponse;
    };
    statistics: {
      totalPlayTime: number; // milliseconds
      actionsPerformed: number;
      beatsCompleted: number;
      choicesMade: number;
      averageResponseTime: number;
      sessionStarted: Date;
    };
  };
  settings: {
    autoSave: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    hints: boolean;
    fastMode: boolean;
    narrativeVerbosity: 'minimal' | 'standard' | 'verbose';
  };
}

export interface SessionAction {
  sessionId: string;
  playerId: string;
  type: 'quick_action' | 'custom_input' | 'system_action';
  data: {
    actionId?: string;
    customText?: string;
    beatId: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  };
}

export interface SessionUpdate {
  sessionId: string;
  updateType: 'story_progress' | 'player_action' | 'ai_response' | 'status_change';
  data: any;
  timestamp: Date;
}

export interface GameSessionConfig {
  metadataService: StoryMetadataService;
  storyLoader: ProgressiveStoryLoader;
  validationService: StoryValidationService;
  database: HybridDatabase;
  sessionTimeout: number; // minutes
  autoSaveInterval: number; // minutes
  maxConcurrentSessions: number;
  enableRealTimeUpdates: boolean;
  aiResponseTimeout: number; // seconds
}

export class GameSessionService {
  private activeSessions = new Map<string, GameSession>();
  private sessionTimeouts = new Map<string, NodeJS.Timeout>();
  private autoSaveTimers = new Map<string, NodeJS.Timeout>();
  private updateSubscribers = new Map<string, Array<(update: SessionUpdate) => void>>();

  constructor(private config: GameSessionConfig) {}

  /**
   * Create a new game session
   */
  async createSession(playerId: string, storyId: string, settings?: Partial<GameSession['settings']>): Promise<GameSession> {
    // Validate story is available
    const storyMetadata = await this.config.metadataService.getStoryMetadata(storyId);
    if (!storyMetadata || !storyMetadata.available) {
      throw new Error(`Story ${storyId} is not available`);
    }

    // Validate story content
    const validation = await this.config.validationService.validateStory(storyId);
    if (!validation.valid) {
      throw new Error(`Story ${storyId} has validation errors and cannot be started`);
    }

    // Check concurrent session limits
    const playerActiveSessions = Array.from(this.activeSessions.values())
      .filter(session => session.playerId === playerId && session.status === 'active');
    
    if (playerActiveSessions.length >= this.config.maxConcurrentSessions) {
      throw new Error(`Player ${playerId} has reached the maximum number of concurrent sessions (${this.config.maxConcurrentSessions})`);
    }

    // Initialize story session
    const storyContent = await this.config.storyLoader.initializeStory(storyId, playerId);

    // Create new session
    const sessionId = uuidv4();
    const session: GameSession = {
      id: sessionId,
      playerId,
      storyId,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date(),
      currentBeatId: storyContent.currentBeat.id,
      sessionData: {
        playerChoices: [],
        storyProgress: storyContent.progressState,
        aiContext: {
          conversationHistory: [],
          playerMood: 'curious',
          narrativeStyle: 'descriptive',
        },
        statistics: {
          totalPlayTime: 0,
          actionsPerformed: 0,
          beatsCompleted: 0,
          choicesMade: 0,
          averageResponseTime: 0,
          sessionStarted: Date.now()
        }
      },
      settings: {
        autoSave: true,
        difficulty: storyMetadata.difficulty as any,
        hints: true,
        fastMode: false,
        narrativeVerbosity: 'standard',
        ...settings
      }
    };

    // Store session
    this.activeSessions.set(sessionId, session);
    await this.persistSession(session);

    // Set up session management
    this.setupSessionTimeout(sessionId);
    if (session.settings.autoSave) {
      this.setupAutoSave(sessionId);
    }

    // Notify subscribers
    this.notifySubscribers(sessionId, {
      sessionId,
      updateType: 'status_change',
      data: { status: 'active', created: true },
      timestamp: new Date()
    });

    return session;
  }

  /**
   * Load an existing session
   */
  async loadSession(sessionId: string, playerId: string): Promise<GameSession> {
    // Check active sessions first
    let session = this.activeSessions.get(sessionId);
    
    if (!session) {
      // Load from database
      const savedSession = await this.loadSessionFromDatabase(sessionId);
      if (!savedSession || savedSession.playerId !== playerId) {
        throw new Error(`Session ${sessionId} not found or access denied`);
      }
      
      session = savedSession;
      this.activeSessions.set(sessionId, session);
    }

    // Verify player ownership
    if (session.playerId !== playerId) {
      throw new Error(`Access denied to session ${sessionId}`);
    }

    // Update last active time but preserve status
    session.lastActiveAt = new Date();

    // Only set up session management for active sessions
    if (session.status === 'active') {
      this.setupSessionTimeout(sessionId);
      if (session.settings.autoSave) {
        this.setupAutoSave(sessionId);
      }
    }

    await this.persistSession(session);

    return session;
  }

  /**
   * Process a player action within a session
   */
  async processAction(action: SessionAction): Promise<ActionResponse> {
    const session = this.activeSessions.get(action.sessionId);
    if (!session) {
      throw new Error(`Session ${action.sessionId} not found`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session ${action.sessionId} is not active`);
    }

    if (session.playerId !== action.playerId) {
      throw new Error(`Access denied to session ${action.sessionId}`);
    }

    const startTime = Date.now();

    try {
      // Update session activity
      session.lastActiveAt = new Date();
      this.refreshSessionTimeout(action.sessionId);

      // Record player interaction
      const interaction: PlayerInteraction = {
        id: uuidv4(),
        gameId: action.sessionId,
        playerId: action.playerId,
        input: action.data.customText || action.data.actionId || '',
        response: '', // Will be filled after processing
        timestamp: action.data.timestamp.getTime(),
        beatId: action.data.beatId
      };

      await this.config.database.storeInteraction(interaction);

      // Process the action based on type
      let response: ActionResponse;
      
      if (action.type === 'quick_action') {
        response = await this.processQuickAction(session, action, startTime);
      } else if (action.type === 'custom_input') {
        response = await this.processCustomInput(session, action);
      } else {
        response = await this.processSystemAction(session, action);
      }

      // Update session statistics
      const responseTime = Date.now() - startTime;
      this.updateSessionStatistics(session, responseTime);

      // Store AI response
      await this.config.database.storeResponse(interaction.id, response);

      // Update AI context
      this.updateAIContext(session, action, response);

      // Check for story progression
      await this.checkStoryProgression(session, response);

      // Persist session state
      await this.persistSession(session);

      // Notify subscribers
      this.notifySubscribers(action.sessionId, {
        sessionId: action.sessionId,
        updateType: 'ai_response',
        data: response,
        timestamp: new Date()
      });

      return response;

    } catch (error) {
      // Create error response
      const errorResponse: ActionResponse = {
        response: `I apologize, but I encountered an error processing your action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          model: 'error-handler',
          escalated: true,
          confidence: 0.0,
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          cost: 0,
          suggestions: ['Try a different action', 'Contact support if the issue persists']
        }
      };

      // Try to store error response if interaction was created
      try {
        await this.config.database.storeResponse(interaction.id, errorResponse);
      } catch (storeError) {
        // If interaction wasn't created yet, create a temporary ID
        const tempId = uuidv4();
        await this.config.database.storeResponse(tempId, errorResponse);
      }
      throw error;
    }
  }

  /**
   * Get current session state
   */
  async getSessionState(sessionId: string, playerId: string): Promise<ClientGameState> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.playerId !== playerId) {
      throw new Error(`Session ${sessionId} not found or access denied`);
    }

    // Load current story content
    const storyContent = await this.config.storyLoader.loadStorySession(session.storyId, playerId);

    // Convert progressive story beat to standard StoryBeat format
    const currentBeat: StoryBeat = {
      id: storyContent.currentBeat.id,
      act: storyContent.currentBeat.act as 1 | 2 | 3,
      title: storyContent.currentBeat.title,
      description: storyContent.currentBeat.description || storyContent.currentBeat.narrativeGuidance.openingText,
      setting: {
        location: storyContent.currentBeat.setting?.location || 'Unknown Location',
        timeOfDay: storyContent.currentBeat.setting?.timeOfDay || 'day',
        atmosphere: storyContent.currentBeat.setting?.atmosphere || 'neutral'
      },
      objectives: (storyContent.currentBeat.objectives || []).map(obj => ({
        id: obj.id,
        description: obj.description,
        type: obj.type,
        completionHints: obj.completionHints || [],
        weight: obj.weight || 1,
        isCompleted: false
      })),
      exitTransitions: [], // Would be populated from exitConditions
      aiGuidance: storyContent.aiGuidance,
      isInitial: storyContent.currentBeat.act === 1,
      isEnding: false
    };

    return {
      gameId: sessionId,
      currentBeat,
      playerState: {
        health: storyContent.progressState.hiddenMechanicsState.health || 100,
        location: currentBeat.setting.location,
        level: storyContent.progressState.hiddenMechanicsState.level || 1,
        inventory: [] // Would be populated from discovered items
      },
      isConnected: true,
      lastUpdate: session.lastActiveAt
    };
  }

  /**
   * Save current session as a game save
   */
  async saveGame(sessionId: string, playerId: string, saveName: string, description?: string): Promise<GameSave> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.playerId !== playerId) {
      throw new Error(`Session ${sessionId} not found or access denied`);
    }

    const gameSave: GameSave = {
      id: uuidv4(),
      playerId,
      storyId: session.storyId,
      saveName,
      gameState: session.sessionData.storyProgress,
      currentBeatId: session.currentBeatId,
      createdAt: new Date(),
      description
    };

    await this.config.database.saveGame(gameSave);

    // Update session to mark it as saved
    session.sessionData.statistics.totalPlayTime = this.calculateTotalPlayTime(session);
    await this.persistSession(session);

    return gameSave;
  }

  /**
   * Pause a session
   */
  async pauseSession(sessionId: string, playerId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.playerId !== playerId) {
      throw new Error(`Session ${sessionId} not found or access denied`);
    }

    session.status = 'paused';
    session.sessionData.statistics.totalPlayTime = this.calculateTotalPlayTime(session);
    
    // Clear timers
    this.clearSessionTimers(sessionId);
    
    await this.persistSession(session);

    this.notifySubscribers(sessionId, {
      sessionId,
      updateType: 'status_change',
      data: { status: 'paused' },
      timestamp: new Date()
    });
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string, playerId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.playerId !== playerId) {
      throw new Error(`Session ${sessionId} not found or access denied`);
    }

    if (session.status !== 'paused') {
      throw new Error(`Session ${sessionId} is not paused`);
    }

    session.status = 'active';
    session.lastActiveAt = new Date();
    
    // Restart timers
    this.setupSessionTimeout(sessionId);
    if (session.settings.autoSave) {
      this.setupAutoSave(sessionId);
    }
    
    await this.persistSession(session);

    this.notifySubscribers(sessionId, {
      sessionId,
      updateType: 'status_change',
      data: { status: 'active' },
      timestamp: new Date()
    });
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, playerId: string, reason: 'completed' | 'abandoned'): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.playerId !== playerId) {
      throw new Error(`Session ${sessionId} not found or access denied`);
    }

    session.status = reason;
    session.sessionData.statistics.totalPlayTime = this.calculateTotalPlayTime(session);
    
    // Clear timers
    this.clearSessionTimers(sessionId);
    
    // Final persistence
    await this.persistSession(session);
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    this.notifySubscribers(sessionId, {
      sessionId,
      updateType: 'status_change',
      data: { status: reason, ended: true },
      timestamp: new Date()
    });
  }

  /**
   * Get sessions for a player
   */
  async getPlayerSessions(playerId: string, includeInactive = false): Promise<GameSession[]> {
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(session => session.playerId === playerId);

    if (!includeInactive) {
      return activeSessions.filter(session => session.status === 'active');
    }

    // Load inactive sessions from database
    const inactiveSessions = await this.loadPlayerSessionsFromDatabase(playerId);
    
    // Merge and deduplicate
    const allSessions = new Map<string, GameSession>();
    
    for (const session of [...activeSessions, ...inactiveSessions]) {
      allSessions.set(session.id, session);
    }

    return Array.from(allSessions.values());
  }

  /**
   * Subscribe to session updates
   */
  subscribeToUpdates(sessionId: string, callback: (update: SessionUpdate) => void): () => void {
    if (!this.updateSubscribers.has(sessionId)) {
      this.updateSubscribers.set(sessionId, []);
    }
    
    this.updateSubscribers.get(sessionId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.updateSubscribers.get(sessionId);
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Get service statistics
   */
  getStats() {
    const activeSessions = Array.from(this.activeSessions.values());
    const activeCount = activeSessions.filter(s => s.status === 'active').length;
    const pausedCount = activeSessions.filter(s => s.status === 'paused').length;

    return {
      totalActiveSessions: this.activeSessions.size,
      activeSessionsCount: activeCount,
      pausedSessionsCount: pausedCount,
      sessionTimeouts: this.sessionTimeouts.size,
      autoSaveTimers: this.autoSaveTimers.size,
      subscribers: this.updateSubscribers.size,
      averageSessionLength: this.calculateAverageSessionLength(activeSessions),
      configuredLimits: {
        sessionTimeout: this.config.sessionTimeout,
        maxConcurrentSessions: this.config.maxConcurrentSessions,
        autoSaveInterval: this.config.autoSaveInterval
      }
    };
  }

  /**
   * Cleanup inactive sessions
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const timeoutMs = this.config.sessionTimeout * 60 * 1000;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActiveAt.getTime() > timeoutMs) {
        await this.endSession(sessionId, session.playerId, 'abandoned');
      }
    }
  }

  /**
   * Private helper methods
   */

  private async processQuickAction(session: GameSession, action: SessionAction, startTime: number): Promise<ActionResponse> {
    // Update story state with the quick action
    const storyUpdate = await this.config.storyLoader.updateStoryProgress(
      session.storyId,
      session.playerId,
      {
        statChanges: action.data.metadata?.statChanges,
        relationshipChanges: action.data.metadata?.relationshipChanges,
        revealedCharacters: action.data.metadata?.revealedCharacters,
        discoveredItems: action.data.metadata?.discoveredItems
      }
    );

    // Record player choice
    session.sessionData.playerChoices.push({
      beatId: action.data.beatId,
      actionId: action.data.actionId!,
      timestamp: action.data.timestamp,
      effects: action.data.metadata || {}
    });

    const responseText = this.generateActionResponse(storyUpdate, action);
    
    return {
      response: responseText,
      gameState: {
        playerStats: this.convertToPlayerStats(storyUpdate.progressState.hiddenMechanicsState),
        storyVariables: storyUpdate.progressState.hiddenMechanicsState,
        characterRelationships: storyUpdate.progressState.relationshipsState
      },
      choices: storyUpdate.currentBeat.quickActions.map(a => a.label),
      metadata: {
        model: 'game-engine',
        escalated: false,
        confidence: 1.0,
        processingTime: Date.now() - startTime,
        tokensUsed: 0,
        cost: 0,
        suggestions: storyUpdate.currentBeat.quickActions.map(a => a.description)
      }
    };
  }

  private async processCustomInput(session: GameSession, action: SessionAction): Promise<ActionResponse> {
    // This would integrate with the AI orchestrator to process free-form input
    // For now, return a placeholder response
    return {
      response: `I understand you want to: "${action.data.customText}". Let me process that action...`,
      metadata: {
        model: 'ai-orchestrator',
        escalated: false,
        confidence: 0.8,
        processingTime: 100,
        tokensUsed: 50,
        cost: 0.001,
        suggestions: ['Try one of the available quick actions', 'Be more specific about your intent']
      }
    };
  }

  private async processSystemAction(session: GameSession, action: SessionAction): Promise<ActionResponse> {
    // Handle system actions like hints, status checks, etc.
    return {
      response: 'System action processed.',
      metadata: {
        model: 'system',
        escalated: false,
        confidence: 1.0,
        processingTime: 10,
        tokensUsed: 0,
        cost: 0
      }
    };
  }

  private convertToPlayerStats(mechanics: Record<string, number>): PlayerStats {
    return {
      health: mechanics.health || 100,
      maxHealth: mechanics.maxHealth || 100,
      experience: mechanics.experience || 0,
      level: mechanics.level || 1,
      attributes: mechanics
    };
  }

  private generateActionResponse(storyContent: any, action: SessionAction): string {
    const beat = storyContent.currentBeat;
    const actionData = beat.quickActions.find((a: any) => a.id === action.data.actionId);
    
    if (actionData) {
      return `You chose to ${actionData.label.toLowerCase()}. ${beat.narrativeGuidance.openingText}`;
    }
    
    return beat.narrativeGuidance.openingText;
  }

  private updateSessionStatistics(session: GameSession, responseTime: number): void {
    const stats = session.sessionData.statistics;
    stats.actionsPerformed += 1;
    stats.choicesMade += 1;
    
    // Update average response time
    stats.averageResponseTime = (stats.averageResponseTime * (stats.actionsPerformed - 1) + responseTime) / stats.actionsPerformed;
  }

  private updateAIContext(session: GameSession, action: SessionAction, response: ActionResponse): void {
    const context = session.sessionData.aiContext;
    
    // Add to conversation history
    context.conversationHistory.push({
      type: 'player',
      content: action.data.customText || action.data.actionId || '',
      timestamp: action.data.timestamp
    });
    
    context.conversationHistory.push({
      type: 'ai',
      content: response.response,
      timestamp: new Date()
    });

    // Keep history manageable
    if (context.conversationHistory.length > 20) {
      context.conversationHistory = context.conversationHistory.slice(-20);
    }

    context.lastAIResponse = response;
  }

  private async checkStoryProgression(session: GameSession, response: ActionResponse): Promise<void> {
    // For now, story progression is handled through the ProgressiveStoryLoader
    // This method could be enhanced to detect beat changes from AI responses
    
    // Placeholder for future beat transition detection logic
    if (response.stateUpdates?.newBeatId) {
      const newBeatId = response.stateUpdates.newBeatId as string;
      if (newBeatId !== session.currentBeatId) {
        session.currentBeatId = newBeatId;
        session.sessionData.statistics.beatsCompleted += 1;

        this.notifySubscribers(session.id, {
          sessionId: session.id,
          updateType: 'story_progress',
          data: { newBeatId: session.currentBeatId },
          timestamp: new Date()
        });
      }
    }
  }

  private setupSessionTimeout(sessionId: string): void {
    this.clearSessionTimeout(sessionId);
    
    const timeout = setTimeout(async () => {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        await this.endSession(sessionId, session.playerId, 'abandoned');
      }
    }, this.config.sessionTimeout * 60 * 1000);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  private setupAutoSave(sessionId: string): void {
    this.clearAutoSave(sessionId);
    
    const timer = setInterval(async () => {
      const session = this.activeSessions.get(sessionId);
      if (session && session.status === 'active') {
        await this.persistSession(session);
      }
    }, this.config.autoSaveInterval * 60 * 1000);

    this.autoSaveTimers.set(sessionId, timer);
  }

  private refreshSessionTimeout(sessionId: string): void {
    if (this.sessionTimeouts.has(sessionId)) {
      this.setupSessionTimeout(sessionId);
    }
  }

  private clearSessionTimeout(sessionId: string): void {
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  private clearAutoSave(sessionId: string): void {
    const timer = this.autoSaveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  private clearSessionTimers(sessionId: string): void {
    this.clearSessionTimeout(sessionId);
    this.clearAutoSave(sessionId);
  }

  private calculateTotalPlayTime(session: GameSession): number {
    const now = Date.now();
    const sessionStart = session.sessionData.statistics.sessionStarted;
    return session.sessionData.statistics.totalPlayTime + (now - sessionStart);
  }

  private calculateAverageSessionLength(sessions: GameSession[]): number {
    if (sessions.length === 0) return 0;
    
    const totalTime = sessions.reduce((sum, session) => {
      return sum + this.calculateTotalPlayTime(session);
    }, 0);
    
    return totalTime / sessions.length;
  }

  private async persistSession(session: GameSession): Promise<void> {
    // Store session in database
    // This would use the HybridDatabase to store session state
    console.log(`Persisting session ${session.id} for player ${session.playerId}`);
  }

  private async loadSessionFromDatabase(sessionId: string): Promise<GameSession | null> {
    // Load session from database
    // This would query the HybridDatabase for stored session
    console.log(`Loading session ${sessionId} from database`);
    return null;
  }

  private async loadPlayerSessionsFromDatabase(playerId: string): Promise<GameSession[]> {
    // Load all sessions for a player from database
    console.log(`Loading sessions for player ${playerId} from database`);
    return [];
  }

  private notifySubscribers(sessionId: string, update: SessionUpdate): void {
    const subscribers = this.updateSubscribers.get(sessionId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error(`Error notifying subscriber for session ${sessionId}:`, error);
        }
      });
    }
  }
}