/**
 * LMDB store implementation for high-frequency gameplay data
 * Handles player interactions, AI responses, session context, and real-time game state
 */

import { open, Database } from 'lmdb';
import { PlayerInteraction, ActionResponse, ClientGameState } from '../types/game.js';
import type { AIModelUsage } from '../types/ai.js';

export interface LMDBConfig {
  path: string;
  mapSize: number; // Maximum database size in bytes
  maxDbs: number; // Maximum number of databases
  compression?: boolean;
  dupSort?: boolean;
}

export interface LMDBStoreOptions {
  config: LMDBConfig;
  enableLogging?: boolean;
}

export class LMDBStore {
  private interactions: Database;
  private responses: Database;
  private gameStates: Database;
  private sessions: Database;
  private aiMetrics: Database;

  constructor(private options: LMDBStoreOptions) {
    // Initialize sub-databases for different data types
    this.interactions = open({
      path: `${options.config.path}/interactions`,
      compression: options.config.compression ?? true,
      mapSize: options.config.mapSize,
    });
    this.responses = open({
      path: `${options.config.path}/responses`,
      compression: options.config.compression ?? true,
      mapSize: options.config.mapSize,
    });
    this.gameStates = open({
      path: `${options.config.path}/game_states`,
      compression: options.config.compression ?? true,
      mapSize: options.config.mapSize,
    });
    this.sessions = open({
      path: `${options.config.path}/sessions`,
      compression: options.config.compression ?? true,
      mapSize: options.config.mapSize,
    });
    this.aiMetrics = open({
      path: `${options.config.path}/ai_metrics`,
      compression: options.config.compression ?? true,
      mapSize: options.config.mapSize,
    });
  }

  /**
   * Player Interactions - High frequency read/write operations
   */
  async storeInteraction(interaction: PlayerInteraction): Promise<void> {
    const key = `${interaction.gameId}:${interaction.timestamp}`;
    await this.interactions.put(key, interaction);
  }

  async getInteractionHistory(
    gameId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PlayerInteraction[]> {
    const interactions: PlayerInteraction[] = [];
    const prefix = `${gameId}:`;

    for (const { value } of this.interactions.getRange({
      start: prefix,
      end: `${prefix  }\xFF`,
      reverse: true,
      limit,
      offset,
    })) {
      interactions.push(value as PlayerInteraction);
    }

    return interactions;
  }

  async getLastInteraction(gameId: string): Promise<PlayerInteraction | null> {
    const prefix = `${gameId}:`;
    
    for (const { value } of this.interactions.getRange({
      start: prefix,
      end: `${prefix  }\xFF`,
      reverse: true,
      limit: 1,
    })) {
      return value as PlayerInteraction;
    }

    return null;
  }

  /**
   * AI Responses - Store generated responses with metadata
   */
  async storeResponse(
    interactionId: string,
    response: ActionResponse
  ): Promise<void> {
    await this.responses.put(interactionId, response);
  }

  async getResponse(interactionId: string): Promise<ActionResponse | null> {
    return (await this.responses.get(interactionId)) ?? null;
  }

  async getRecentResponses(
    gameId: string,
    limit: number = 20
  ): Promise<ActionResponse[]> {
    const interactions = await this.getInteractionHistory(gameId, limit);
    const responses: ActionResponse[] = [];

    for (const interaction of interactions) {
      const response = await this.getResponse(interaction.id);
      if (response) {
        responses.push(response);
      }
    }

    return responses;
  }

  /**
   * Game State - Current game state snapshots
   */
  async storeGameState(gameId: string, state: ClientGameState): Promise<void> {
    await this.gameStates.put(gameId, {
      ...state,
      lastUpdate: new Date(),
    });
  }

  async getGameState(gameId: string): Promise<ClientGameState | null> {
    return (await this.gameStates.get(gameId)) ?? null;
  }

  async deleteGameState(gameId: string): Promise<boolean> {
    return await this.gameStates.remove(gameId);
  }

  /**
   * Session Management - Active session tracking
   */
  async createSession(
    sessionId: string,
    data: {
      playerId: string;
      gameId: string;
      startedAt: Date;
    }
  ): Promise<void> {
    await this.sessions.put(sessionId, {
      ...data,
      lastActivity: new Date(),
      isActive: true,
    });
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.sessions.get(sessionId);
    if (session) {
      await this.sessions.put(sessionId, {
        ...session,
        lastActivity: new Date(),
      });
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const session = await this.sessions.get(sessionId);
    if (session) {
      await this.sessions.put(sessionId, {
        ...session,
        isActive: false,
        endedAt: new Date(),
      });
    }
  }

  async getActiveSessions(): Promise<Array<{ id: string; data: any }>> {
    const sessions: Array<{ id: string; data: any }> = [];

    for (const { key, value } of this.sessions.getRange()) {
      if (value.isActive) {
        sessions.push({ id: key as string, data: value });
      }
    }

    return sessions;
  }

  /**
   * AI Metrics - Performance and usage tracking
   */
  async recordAIUsage(usage: AIModelUsage): Promise<void> {
    const key = `${usage.model}:${Date.now()}`;
    await this.aiMetrics.put(key, usage);
  }

  async getAIMetrics(
    model?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<AIModelUsage[]> {
    const metrics: AIModelUsage[] = [];
    const startKey = model ? `${model}:` : '';
    const endKey = model ? `${model}:\xFF` : '\xFF';

    for (const { value } of this.aiMetrics.getRange({
      start: startKey,
      end: endKey,
    })) {
      const usage = value as AIModelUsage;
      
      if (timeRange) {
        const usageTime = new Date(usage.timestamp);
        if (usageTime < timeRange.start || usageTime > timeRange.end) {
          continue;
        }
      }

      metrics.push(usage);
    }

    return metrics;
  }

  /**
   * Cleanup and Maintenance
   */
  async cleanupOldData(olderThanDays: number = 7): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Clean up old interactions
    const keysToDelete: string[] = [];
    for (const { key, value } of this.interactions.getRange()) {
      const interaction = value as PlayerInteraction;
      if (interaction.timestamp < cutoffTime) {
        keysToDelete.push(key as string);
      }
    }

    for (const key of keysToDelete) {
      await this.interactions.remove(key);
    }

    // Clean up old AI metrics
    const metricsToDelete: string[] = [];
    for (const { key, value } of this.aiMetrics.getRange()) {
      const usage = value as AIModelUsage;
      if (usage.timestamp < cutoffTime) {
        metricsToDelete.push(key as string);
      }
    }

    for (const key of metricsToDelete) {
      await this.aiMetrics.remove(key);
    }

    if (this.options.enableLogging) {
      console.log(`Cleaned up ${keysToDelete.length} interactions and ${metricsToDelete.length} AI metrics`);
    }
  }

  async getStats(): Promise<{
    interactions: number;
    responses: number;
    gameStates: number;
    sessions: number;
    aiMetrics: number;
  }> {
    return {
      interactions: await this.interactions.getCount(),
      responses: await this.responses.getCount(),
      gameStates: await this.gameStates.getCount(),
      sessions: await this.sessions.getCount(),
      aiMetrics: await this.aiMetrics.getCount(),
    };
  }

  /**
   * Batch Operations for Performance
   */
  async batchStore(operations: Array<{
    type: 'interaction' | 'response' | 'gameState' | 'aiMetric';
    key: string;
    data: any;
  }>): Promise<void> {
    // LMDB doesn't support cross-database transactions
    // So we'll process operations sequentially
    for (const op of operations) {
      switch (op.type) {
        case 'interaction':
          await this.interactions.put(op.key, op.data);
          break;
        case 'response':
          await this.responses.put(op.key, op.data);
          break;
        case 'gameState':
          await this.gameStates.put(op.key, op.data);
          break;
        case 'aiMetric':
          await this.aiMetrics.put(op.key, op.data);
          break;
      }
    }
  }

  /**
   * Connection Management
   */
  async close(): Promise<void> {
    await this.interactions.close();
    await this.responses.close();
    await this.gameStates.close();
    await this.sessions.close();
    await this.aiMetrics.close();
  }

  async backup(backupPath: string): Promise<void> {
    // LMDB backup is typically done by copying the database files
    // This is a placeholder - in practice you'd use filesystem operations
    console.log(`Backup to ${backupPath} - implement filesystem copy`);
  }

  isConnected(): boolean {
    try {
      // Try to perform a simple operation to check if the database is accessible
      this.interactions.getCount();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Factory function for creating LMDB store instances
 */
export function createLMDBStore(options: LMDBStoreOptions): LMDBStore {
  return new LMDBStore(options);
}

/**
 * Default configuration for development
 */
export const defaultLMDBConfig: LMDBConfig = {
  path: './data/lmdb',
  mapSize: 1024 * 1024 * 1024, // 1GB
  maxDbs: 10,
  compression: true,
  dupSort: true,
};