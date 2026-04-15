import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameAPIClient } from '../../../src/client/GameAPIClient';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GameAPIClient', () => {
  let client: GameAPIClient;

  beforeEach(() => {
    client = new GameAPIClient('http://localhost:3000');
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getStoryCatalog', () => {
    it('should fetch story catalog successfully', async () => {
      const mockCatalog = { stories: [] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCatalog),
      });

      const result = await client.getStoryCatalog();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/stories', {
        headers: {
          'User-Agent': 'Bytebound-Chronicles-Terminal-Client/0.3.0',
        },
      });
      expect(result).toEqual(mockCatalog);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      await expect(client.getStoryCatalog()).rejects.toThrow('Server error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(client.getStoryCatalog()).rejects.toThrow(
        'Failed to connect to the game server. Please check your connection and ensure the server is running.'
      );
    });
  });

  describe('createGame', () => {
    it('should create game successfully', async () => {
      const mockSession = { id: 'game-123', playerId: 'player-456' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      const result = await client.createGame('player-456', 'story-789');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bytebound-Chronicles-Terminal-Client/0.3.0',
        },
        body: JSON.stringify({ playerId: 'player-456', storyId: 'story-789' }),
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe('processAction', () => {
    it('should process action successfully', async () => {
      const mockResponse = { success: true, result: 'Action processed' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const action = { type: 'text', content: 'look around' };
      const result = await client.processAction('game-123', action);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/games/game-123/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bytebound-Chronicles-Terminal-Client/0.3.0',
        },
        body: JSON.stringify(action),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle malformed error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(client.getStoryCatalog()).rejects.toThrow('HTTP 400: Bad Request');
    });

    it('should preserve original error messages', async () => {
      const originalError = new Error('Custom error message');
      mockFetch.mockRejectedValue(originalError);

      await expect(client.getStoryCatalog()).rejects.toThrow('Custom error message');
    });
  });
});