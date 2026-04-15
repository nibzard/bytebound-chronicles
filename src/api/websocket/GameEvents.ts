import { connectionManager, WebSocketMessage } from './ConnectionManager';
import { logger } from '../../utils';
import { AIThinkingStatus } from '../../types';

export enum GameEventType {
  GAME_STATE_UPDATE = 'game_state_update',
  PLAYER_ACTION = 'player_action',
  AI_RESPONSE = 'ai_response',
  AI_THINKING = 'ai_thinking',
  GAME_PAUSED = 'game_paused',
  GAME_RESUMED = 'game_resumed',
  GAME_SAVED = 'game_saved',
  GAME_ERROR = 'game_error',
  STORY_BEAT_CHANGE = 'story_beat_change',
  SESSION_UPDATE = 'session_update',
}

export interface GameEventPayload {
  gameId: string;
  playerId?: string;
  timestamp: Date;
  data: any;
}

export class GameEvents {
  public emitGameStateUpdate(gameId: string, gameState: any): void {
    const message: WebSocketMessage = {
      type: GameEventType.GAME_STATE_UPDATE,
      payload: {
        gameId,
        timestamp: new Date(),
        data: gameState,
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.info(`Game state update sent to ${sent} connections for game ${gameId}`);
  }

  public emitPlayerAction(gameId: string, playerId: string, action: any): void {
    const message: WebSocketMessage = {
      type: GameEventType.PLAYER_ACTION,
      payload: {
        gameId,
        playerId,
        timestamp: new Date(),
        data: action,
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.info(`Player action broadcasted to ${sent} connections for game ${gameId}`);
  }

  public emitAIResponse(gameId: string, response: any): void {
    const message: WebSocketMessage = {
      type: GameEventType.AI_RESPONSE,
      payload: {
        gameId,
        timestamp: new Date(),
        data: response,
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.info(`AI response sent to ${sent} connections for game ${gameId}`);
  }

  public emitAIThinking(gameId: string, status: AIThinkingStatus): void {
    const message: WebSocketMessage = {
      type: GameEventType.AI_THINKING,
      payload: {
        gameId,
        timestamp: new Date(),
        data: {
          status,
          isThinking: status !== 'idle',
          message: this.getThinkingMessage(status),
        },
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.debug(`AI thinking status (${status}) sent to ${sent} connections for game ${gameId}`);
  }

  public emitGamePaused(gameId: string, reason?: string): void {
    const message: WebSocketMessage = {
      type: GameEventType.GAME_PAUSED,
      payload: {
        gameId,
        timestamp: new Date(),
        data: { reason },
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.info(`Game paused event sent to ${sent} connections for game ${gameId}`);
  }

  public emitGameResumed(gameId: string): void {
    const message: WebSocketMessage = {
      type: GameEventType.GAME_RESUMED,
      payload: {
        gameId,
        timestamp: new Date(),
        data: {},
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.info(`Game resumed event sent to ${sent} connections for game ${gameId}`);
  }

  public emitGameSaved(gameId: string, saveId: string): void {
    const message: WebSocketMessage = {
      type: GameEventType.GAME_SAVED,
      payload: {
        gameId,
        timestamp: new Date(),
        data: { saveId },
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.info(`Game saved event sent to ${sent} connections for game ${gameId}`);
  }

  public emitGameError(gameId: string, error: any): void {
    const message: WebSocketMessage = {
      type: GameEventType.GAME_ERROR,
      payload: {
        gameId,
        timestamp: new Date(),
        data: {
          error: error.message || 'Unknown error occurred',
          code: error.code,
          recoverable: error.recoverable || false,
        },
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.error(`Game error event sent to ${sent} connections for game ${gameId}:`, error);
  }

  public emitStoryBeatChange(gameId: string, currentBeat: string, nextBeat?: string): void {
    const message: WebSocketMessage = {
      type: GameEventType.STORY_BEAT_CHANGE,
      payload: {
        gameId,
        timestamp: new Date(),
        data: {
          currentBeat,
          nextBeat,
        },
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.info(`Story beat change sent to ${sent} connections for game ${gameId}`);
  }

  public emitSessionUpdate(gameId: string, sessionData: any): void {
    const message: WebSocketMessage = {
      type: GameEventType.SESSION_UPDATE,
      payload: {
        gameId,
        timestamp: new Date(),
        data: sessionData,
      },
      timestamp: new Date(),
    };

    const sent = connectionManager.broadcastToGame(gameId, message);
    logger.debug(`Session update sent to ${sent} connections for game ${gameId}`);
  }

  private getThinkingMessage(status: AIThinkingStatus): string {
    switch (status) {
      case 'processing_action':
        return 'Processing your action...';
      case 'generating_response':
        return 'Generating response...';
      case 'analyzing_context':
        return 'Analyzing context...';
      case 'selecting_model':
        return 'Selecting AI model...';
      case 'thinking':
        return 'Thinking...';
      case 'idle':
      default:
        return '';
    }
  }

  public getConnectionStats(): { totalConnections: number; gameConnections: Map<string, number> } {
    const gameConnections = new Map<string, number>();
    
    // This would need to be implemented in ConnectionManager to get game-specific counts
    // For now, return basic stats
    return {
      totalConnections: connectionManager.getConnectionCount(),
      gameConnections,
    };
  }
}

export const gameEvents = new GameEvents();