/**
 * Hybrid Database Service
 * Combines LMDB (high-frequency operations) and SQLite (structured data) stores
 * Provides unified interface for all database operations with intelligent routing
 */

import { LMDBStore, LMDBStoreOptions } from './LMDBStore.js';
import { SQLiteStore, SQLiteStoreOptions } from './SQLiteStore.js';
import { 
  PlayerInteraction, 
  ActionResponse, 
  ClientGameState, 
  GameSave, 
  StoryProgress 
} from '../types/game.js';
import { StoryMetadata } from '../types/story.js';
import type { AIModelUsage } from '../types/ai.js';

export interface HybridDatabaseConfig {
  lmdb: LMDBStoreOptions;
  sqlite: SQLiteStoreOptions;
  enableLogging?: boolean;
  syncInterval?: number; // ms
  enableAutoCleanup?: boolean;
  cleanupIntervalDays?: number;
}

export interface DatabaseStats {
  lmdb: {
    interactions: number;
    responses: number;
    gameStates: number;
    sessions: number;
    aiMetrics: number;
  };
  sqlite: {
    playerProfiles: number;
    gameSaves: number;
    storyProgress: number;
    storyMetadata: number;
    analytics: number;
  };
  totalSize: number;
  lastSync?: Date;
  lastCleanup?: Date;
}

export class HybridDatabase {
  private lmdb: LMDBStore;
  private sqlite: SQLiteStore;
  private syncTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor(private config: HybridDatabaseConfig) {
    this.lmdb = new LMDBStore(config.lmdb);
    this.sqlite = new SQLiteStore(config.sqlite);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Verify both stores are working
      if (!this.lmdb.isConnected()) {
        throw new Error('LMDB store connection failed');
      }

      if (!this.sqlite.isOpen()) {
        throw new Error('SQLite store connection failed');
      }

      // Set up periodic sync if configured
      if (this.config.syncInterval && this.config.syncInterval > 0) {
        this.syncTimer = setInterval(
          () => this.syncStores(),
          this.config.syncInterval
        );
      }

      // Set up periodic cleanup if configured
      if (this.config.enableAutoCleanup) {
        const cleanupInterval = 24 * 60 * 60 * 1000; // Daily cleanup
        this.cleanupTimer = setInterval(
          () => this.performCleanup(),
          cleanupInterval
        );
      }

      this.initialized = true;

      if (this.config.enableLogging) {
        console.log('Hybrid database initialized successfully');
      }
    } catch (error) {
      throw new Error(`Failed to initialize hybrid database: ${error}`);
    }
  }

  /**
   * High-Frequency Operations (LMDB)
   */

  // Player Interactions
  async storeInteraction(interaction: PlayerInteraction): Promise<void> {
    await this.lmdb.storeInteraction(interaction);
  }

  async getInteractionHistory(
    gameId: string,
    limit?: number,
    offset?: number
  ): Promise<PlayerInteraction[]> {
    return await this.lmdb.getInteractionHistory(gameId, limit, offset);
  }

  async getLastInteraction(gameId: string): Promise<PlayerInteraction | null> {
    return await this.lmdb.getLastInteraction(gameId);
  }

  // AI Responses
  async storeResponse(interactionId: string, response: ActionResponse): Promise<void> {
    await this.lmdb.storeResponse(interactionId, response);
  }

  async getResponse(interactionId: string): Promise<ActionResponse | null> {
    return await this.lmdb.getResponse(interactionId);
  }

  async getRecentResponses(gameId: string, limit?: number): Promise<ActionResponse[]> {
    return await this.lmdb.getRecentResponses(gameId, limit);
  }

  // Game State Management
  async storeGameState(gameId: string, state: ClientGameState): Promise<void> {
    await this.lmdb.storeGameState(gameId, state);
  }

  async getGameState(gameId: string): Promise<ClientGameState | null> {
    return await this.lmdb.getGameState(gameId);
  }

  async deleteGameState(gameId: string): Promise<boolean> {
    return await this.lmdb.deleteGameState(gameId);
  }

  // Session Management
  async createSession(sessionId: string, data: {
    playerId: string;
    gameId: string;
    startedAt: Date;
  }): Promise<void> {
    await this.lmdb.createSession(sessionId, data);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.lmdb.updateSessionActivity(sessionId);
  }

  async endSession(sessionId: string): Promise<void> {
    await this.lmdb.endSession(sessionId);
  }

  async getActiveSessions(): Promise<Array<{ id: string; data: any }>> {
    return await this.lmdb.getActiveSessions();
  }

  // AI Metrics
  async recordAIUsage(usage: AIModelUsage): Promise<void> {
    await this.lmdb.recordAIUsage(usage);
  }

  async getAIMetrics(
    model?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<AIModelUsage[]> {
    return await this.lmdb.getAIMetrics(model, timeRange);
  }

  /**
   * Structured Data Operations (SQLite)
   */

  // Player Profiles
  async createPlayerProfile(profile: {
    id: string;
    username: string;
    email?: string;
    preferences: Record<string, unknown>;
    achievements: string[];
    totalPlayTime: number;
    storiesPlayed: number;
    storiesCompleted: number;
  }): Promise<void> {
    await this.sqlite.createPlayerProfile(profile);
  }

  async getPlayerProfile(playerId: string): Promise<any> {
    return await this.sqlite.getPlayerProfile(playerId);
  }

  async updatePlayerProfile(playerId: string, updates: any): Promise<void> {
    await this.sqlite.updatePlayerProfile(playerId, updates);
  }

  // Game Saves
  async saveGame(gameSave: GameSave): Promise<void> {
    // Store in SQLite for persistent storage
    await this.sqlite.saveGame(gameSave);
    
    // Also update current game state in LMDB for quick access
    if (gameSave.gameState) {
      const clientState: ClientGameState = {
        gameId: gameSave.id,
        currentBeat: gameSave.gameState.location as any, // This would need proper mapping
        isConnected: true,
        lastUpdate: new Date(),
      };
      await this.lmdb.storeGameState(gameSave.id, clientState);
    }
  }

  async loadGame(saveId: string): Promise<GameSave | null> {
    return await this.sqlite.loadGame(saveId);
  }

  async getPlayerSaves(playerId: string): Promise<GameSave[]> {
    return await this.sqlite.getPlayerSaves(playerId);
  }

  async deleteSave(saveId: string): Promise<boolean> {
    // Delete from both stores
    const sqliteResult = await this.sqlite.deleteSave(saveId);
    await this.lmdb.deleteGameState(saveId);
    return sqliteResult;
  }

  // Story Progress
  async updateStoryProgress(progress: StoryProgress): Promise<void> {
    await this.sqlite.updateStoryProgress(progress);
  }

  async getStoryProgress(storyId: string, playerId: string): Promise<StoryProgress | null> {
    return await this.sqlite.getStoryProgress(storyId, playerId);
  }

  // Story Metadata
  async storeStoryMetadata(metadata: StoryMetadata): Promise<void> {
    await this.sqlite.storeStoryMetadata(metadata);
  }

  async getStoryMetadata(storyId: string): Promise<StoryMetadata | null> {
    return await this.sqlite.getStoryMetadata(storyId);
  }

  // Analytics
  async recordAnalytics(analytics: {
    id: string;
    playerId: string;
    storyId: string;
    eventType: string;
    eventData: Record<string, unknown>;
    sessionId?: string;
  }): Promise<void> {
    await this.sqlite.recordAnalytics({
      ...analytics,
      timestamp: new Date(),
    });
  }

  async getAnalytics(filters: {
    playerId?: string;
    storyId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    return await this.sqlite.getAnalytics(filters);
  }

  /**
   * Advanced Operations
   */

  // Complete game session context
  async getGameSessionContext(gameId: string): Promise<{
    gameState: ClientGameState | null;
    recentInteractions: PlayerInteraction[];
    recentResponses: ActionResponse[];
    storyProgress: StoryProgress | null;
  }> {
    const [gameState, interactions, responses] = await Promise.all([
      this.getGameState(gameId),
      this.getInteractionHistory(gameId, 10),
      this.getRecentResponses(gameId, 10),
    ]);

    let storyProgress: StoryProgress | null = null;
    if (gameState?.currentBeat && interactions.length > 0) {
      const interaction = interactions[0];
      if (interaction?.playerId) {
        const playerId = interaction.playerId;
        const storyId = gameState.currentBeat.id || ''; // This would need proper mapping
        storyProgress = await this.getStoryProgress(storyId, playerId);
      }
    }

    return {
      gameState,
      recentInteractions: interactions,
      recentResponses: responses,
      storyProgress,
    };
  }

  // Batch operations for performance
  async batchStoreInteractions(interactions: PlayerInteraction[]): Promise<void> {
    const operations = interactions.map(interaction => ({
      type: 'interaction' as const,
      key: `${interaction.gameId}:${interaction.timestamp}`,
      data: interaction,
    }));

    await this.lmdb.batchStore(operations);
  }

  /**
   * Data Consistency and Sync
   */
  private async syncStores(): Promise<void> {
    try {
      // Sync active game states from LMDB to SQLite for backup
      const activeSessions = await this.lmdb.getActiveSessions();
      
      for (const session of activeSessions) {
        const gameState = await this.lmdb.getGameState(session.data.gameId);
        if (gameState) {
          // Update story progress based on current game state
          // This would require more sophisticated mapping logic
          const progress: StoryProgress = {
            storyId: gameState.currentBeat?.id || '',
            playerId: session.data.playerId,
            currentBeatId: gameState.currentBeat?.id || '',
            completedBeats: [],
            visitedLocations: [],
            metCharacters: [],
            discoveredSecrets: [],
            endingImplications: {},
            lastPlayed: new Date(),
            totalPlayTime: 0,
          };

          await this.sqlite.updateStoryProgress(progress);
        }
      }

      if (this.config.enableLogging) {
        console.log(`Synced ${activeSessions.length} active sessions`);
      }
    } catch (error) {
      console.error('Store sync failed:', error);
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      const cleanupDays = this.config.cleanupIntervalDays ?? 7;
      await this.lmdb.cleanupOldData(cleanupDays);

      if (this.config.enableLogging) {
        console.log(`Database cleanup completed for data older than ${cleanupDays} days`);
      }
    } catch (error) {
      console.error('Database cleanup failed:', error);
    }
  }

  /**
   * Health and Monitoring
   */
  async getStats(): Promise<DatabaseStats> {
    const [lmdbStats] = await Promise.all([
      this.lmdb.getStats(),
    ]);

    // SQLite stats would require custom queries
    const sqliteStats = {
      playerProfiles: 0,
      gameSaves: 0,
      storyProgress: 0,
      storyMetadata: 0,
      analytics: 0,
    };

    return {
      lmdb: lmdbStats,
      sqlite: sqliteStats,
      totalSize: 0, // Would need to calculate actual file sizes
      lastSync: new Date(),
      lastCleanup: new Date(),
    };
  }

  async healthCheck(): Promise<{
    lmdb: boolean;
    sqlite: boolean;
    overall: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let lmdbHealthy = false;
    let sqliteHealthy = false;

    try {
      lmdbHealthy = this.lmdb.isConnected();
      if (!lmdbHealthy) {
        errors.push('LMDB store is not connected');
      }
    } catch (error) {
      errors.push(`LMDB health check failed: ${error}`);
    }

    try {
      sqliteHealthy = this.sqlite.isOpen();
      if (!sqliteHealthy) {
        errors.push('SQLite store is not open');
      }
    } catch (error) {
      errors.push(`SQLite health check failed: ${error}`);
    }

    return {
      lmdb: lmdbHealthy,
      sqlite: sqliteHealthy,
      overall: lmdbHealthy && sqliteHealthy,
      errors,
    };
  }

  /**
   * Backup and Recovery
   */
  async backup(backupDir: string): Promise<void> {
    await Promise.all([
      this.lmdb.backup(`${backupDir}/lmdb`),
      this.sqlite.backup(`${backupDir}/sqlite.db`),
    ]);
  }

  /**
   * Database Maintenance
   */
  async optimize(): Promise<void> {
    await this.sqlite.optimize();
    // LMDB doesn't require explicit optimization
  }

  async vacuum(): Promise<void> {
    await this.sqlite.vacuum();
  }

  /**
   * Lifecycle Management
   */
  async close(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    await Promise.all([
      this.lmdb.close(),
      Promise.resolve(this.sqlite.close()),
    ]);

    this.initialized = false;

    if (this.config.enableLogging) {
      console.log('Hybrid database closed');
    }
  }

  /**
   * Transaction Support
   */
  async transaction<T>(fn: (db: HybridDatabase) => Promise<T>): Promise<T> {
    // For now, we don't have cross-store transactions
    // This would require more sophisticated coordination
    return await fn(this);
  }

  sqliteTransaction<T>(fn: () => T): T {
    return this.sqlite.transaction(fn);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Factory function for creating hybrid database instances
 */
export function createHybridDatabase(config: HybridDatabaseConfig): HybridDatabase {
  return new HybridDatabase(config);
}

/**
 * Default configuration for development
 */
export const defaultHybridConfig: HybridDatabaseConfig = {
  lmdb: {
    config: {
      path: './data/lmdb',
      mapSize: 1024 * 1024 * 1024, // 1GB
      maxDbs: 10,
      compression: true,
    },
    enableLogging: false,
  },
  sqlite: {
    config: {
      path: './data/game.db',
      timeout: 5000,
    },
    enableWAL: true,
    enableForeignKeys: true,
    enableLogging: false,
  },
  enableLogging: false,
  syncInterval: 60000, // 1 minute
  enableAutoCleanup: true,
  cleanupIntervalDays: 7,
};