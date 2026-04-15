import { StoryCatalog } from '../services/StoryMetadataService';
import { GameSession } from '../services/GameSessionService';
import { ActionResponse } from '../types/game';

export class GameAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getStoryCatalog(): Promise<StoryCatalog> {
    const response = await this.fetchWithErrorHandling(`${this.baseUrl}/api/stories`);
    return await response.json() as StoryCatalog;
  }

  async getStory(id: string): Promise<any> {
    const response = await this.fetchWithErrorHandling(`${this.baseUrl}/api/stories/${id}`);
    return response.json();
  }

  async createGame(playerId: string, storyId: string): Promise<GameSession> {
    const response = await this.fetchWithErrorHandling(`${this.baseUrl}/api/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId, storyId }),
    });
    return await response.json() as GameSession;
  }

  async getGame(id: string, playerId: string): Promise<GameSession> {
    const response = await this.fetchWithErrorHandling(`${this.baseUrl}/api/games/${id}?playerId=${playerId}`);
    return await response.json() as GameSession;
  }

  async pauseGame(id: string, playerId: string): Promise<void> {
    await this.fetchWithErrorHandling(`${this.baseUrl}/api/games/${id}/pause`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    });
  }

  async resumeGame(id: string, playerId: string): Promise<void> {
    await this.fetchWithErrorHandling(`${this.baseUrl}/api/games/${id}/resume`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    });
  }

  async saveGame(id: string, playerId: string, saveName: string): Promise<any> {
    const response = await this.fetchWithErrorHandling(`${this.baseUrl}/api/games/${id}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId, saveName }),
    });
    return response.json();
  }

  async deleteGame(id: string, playerId: string): Promise<void> {
    await this.fetchWithErrorHandling(`${this.baseUrl}/api/games/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    });
  }

  async processAction(gameId: string, action: any): Promise<ActionResponse> {
    const response = await this.fetchWithErrorHandling(`${this.baseUrl}/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action),
    });
    return await response.json() as ActionResponse;
  }

  private async fetchWithErrorHandling(url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'User-Agent': 'Bytebound-Chronicles-Terminal-Client/0.3.0',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData: any = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If we can't parse the error response, use the default message
        }

        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Failed to connect to the game server. Please check your connection and ensure the server is running.');
      }
      throw error;
    }
  }
}
