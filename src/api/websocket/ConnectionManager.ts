import { WebSocket } from 'ws';
import { logger } from '../../utils';
import { nanoid } from 'nanoid';

export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  gameId?: string;
  playerId?: string;
  lastActivity: Date;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export class ConnectionManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private gameConnections: Map<string, Set<string>> = new Map();

  public addConnection(socket: WebSocket): string {
    const connectionId = nanoid();
    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connection);
    this.setupConnectionHandlers(connection);
    
    logger.info(`WebSocket connection established: ${connectionId}`);
    return connectionId;
  }

  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (connection.gameId) {
        this.removeFromGame(connectionId, connection.gameId);
      }
      this.connections.delete(connectionId);
      logger.info(`WebSocket connection removed: ${connectionId}`);
    }
  }

  public associateWithGame(connectionId: string, gameId: string, playerId?: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.gameId = gameId;
      if (playerId) {
        connection.playerId = playerId;
      }
      
      if (!this.gameConnections.has(gameId)) {
        this.gameConnections.set(gameId, new Set());
      }
      this.gameConnections.get(gameId)!.add(connectionId);
      
      logger.info(`Connection ${connectionId} associated with game ${gameId}`);
    }
  }

  public removeFromGame(connectionId: string, gameId: string): void {
    const gameConnections = this.gameConnections.get(gameId);
    if (gameConnections) {
      gameConnections.delete(connectionId);
      if (gameConnections.size === 0) {
        this.gameConnections.delete(gameId);
      }
    }
  }

  public sendToConnection(connectionId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(message));
        connection.lastActivity = new Date();
        return true;
      } catch (error) {
        logger.error(`Failed to send message to connection ${connectionId}:`, error);
        this.removeConnection(connectionId);
        return false;
      }
    }
    return false;
  }

  public broadcastToGame(gameId: string, message: WebSocketMessage): number {
    const gameConnections = this.gameConnections.get(gameId);
    if (!gameConnections) {
      return 0;
    }

    let successCount = 0;
    for (const connectionId of gameConnections) {
      if (this.sendToConnection(connectionId, message)) {
        successCount++;
      }
    }

    return successCount;
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getGameConnectionCount(gameId: string): number {
    return this.gameConnections.get(gameId)?.size || 0;
  }

  public getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  public cleanupStaleConnections(maxIdleMinutes: number = 30): void {
    const cutoffTime = new Date(Date.now() - maxIdleMinutes * 60 * 1000);
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      if (connection.lastActivity < cutoffTime || connection.socket.readyState !== WebSocket.OPEN) {
        staleConnections.push(connectionId);
      }
    }

    staleConnections.forEach(connectionId => this.removeConnection(connectionId));
    
    if (staleConnections.length > 0) {
      logger.info(`Cleaned up ${staleConnections.length} stale WebSocket connections`);
    }
  }

  private setupConnectionHandlers(connection: WebSocketConnection): void {
    connection.socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(connection, message);
      } catch (error) {
        logger.error(`Failed to parse WebSocket message from ${connection.id}:`, error);
      }
    });

    connection.socket.on('close', () => {
      this.removeConnection(connection.id);
    });

    connection.socket.on('error', (error) => {
      logger.error(`WebSocket error for connection ${connection.id}:`, error);
      this.removeConnection(connection.id);
    });

    connection.socket.on('pong', () => {
      connection.lastActivity = new Date();
    });
  }

  private handleMessage(connection: WebSocketConnection, message: any): void {
    connection.lastActivity = new Date();
    
    switch (message.type) {
      case 'ping':
        this.sendToConnection(connection.id, {
          type: 'pong',
          payload: { timestamp: new Date() },
          timestamp: new Date(),
        });
        break;
      case 'join_game':
        if (message.payload?.gameId) {
          this.associateWithGame(connection.id, message.payload.gameId, message.payload.playerId);
        }
        break;
      case 'leave_game':
        if (connection.gameId) {
          this.removeFromGame(connection.id, connection.gameId);
          delete connection.gameId;
          delete connection.playerId;
        }
        break;
      default:
        logger.warn(`Unknown WebSocket message type: ${message.type}`);
    }
  }

  public startHeartbeat(intervalMinutes: number = 5): void {
    setInterval(() => {
      for (const [connectionId, connection] of this.connections) {
        if (connection.socket.readyState === WebSocket.OPEN) {
          try {
            connection.socket.ping();
          } catch (error) {
            logger.error(`Failed to ping connection ${connectionId}:`, error);
            this.removeConnection(connectionId);
          }
        }
      }
    }, intervalMinutes * 60 * 1000);
  }
}

export const connectionManager = new ConnectionManager();