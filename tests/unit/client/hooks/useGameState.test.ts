/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../../../../src/client/hooks/useGameState';
import { GameAPIClient } from '../../../../src/client/GameAPIClient';

// Mock WebSocketClient
vi.mock('../../../../src/client/WebSocketClient', () => ({
  WebSocketClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    getConnectionStatus: vi.fn(() => true),
  })),
}));

describe('useGameState', () => {
  let mockApiClient: GameAPIClient;

  beforeEach(() => {
    mockApiClient = {
      createGame: vi.fn(),
      getGame: vi.fn(),
      processAction: vi.fn(),
      pauseGame: vi.fn(),
      resumeGame: vi.fn(),
      saveGame: vi.fn(),
      deleteGame: vi.fn(),
    } as any;
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGameState(mockApiClient));
    const [state] = result.current;

    expect(state).toEqual({
      session: null,
      loading: false,
      error: null,
      connected: false,
    });
  });

  it('should create game successfully', async () => {
    const mockSession = { id: 'game-123', playerId: 'player-456' };
    (mockApiClient.createGame as any).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useGameState(mockApiClient));
    const [, actions] = result.current;

    await act(async () => {
      await actions.createGame('player-456', 'story-789');
    });

    const [state] = result.current;
    expect(state.session).toEqual(mockSession);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should handle create game error', async () => {
    const error = new Error('Failed to create game');
    (mockApiClient.createGame as any).mockRejectedValue(error);

    const { result } = renderHook(() => useGameState(mockApiClient));
    const [, actions] = result.current;

    await act(async () => {
      await actions.createGame('player-456', 'story-789');
    });

    const [state] = result.current;
    expect(state.session).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Failed to create game');
  });

  it('should process action successfully', async () => {
    const mockSession = { id: 'game-123', playerId: 'player-456' };
    const mockResponse = { success: true, result: 'Action processed' };
    
    const { result } = renderHook(() => useGameState(mockApiClient));
    const [, actions] = result.current;
    
    await act(async () => {
      (mockApiClient.createGame as any).mockResolvedValue(mockSession);
      await actions.createGame('player-456', 'story-789');
    });
    
    let actionResult: any;
    await act(async () => {
      (mockApiClient.processAction as any).mockResolvedValue(mockResponse);
      actionResult = await actions.processAction({ type: 'text', content: 'look' });
    });

    expect(actionResult).toEqual(mockResponse);
    expect(mockApiClient.processAction).toHaveBeenCalledWith('game-123', { type: 'text', content: 'look' });
  });

  it('should handle process action error', async () => {
    const mockSession = { id: 'game-123', playerId: 'player-456' };
    const error = new Error('Action failed');
    
    const { result } = renderHook(() => useGameState(mockApiClient));
    const [, actions] = result.current;

    await act(async () => {
      (mockApiClient.createGame as any).mockResolvedValue(mockSession);
      await actions.createGame('player-456', 'story-789');
    });

    await act(async () => {
      (mockApiClient.processAction as any).mockRejectedValue(error);
      await actions.processAction({ type: 'text', content: 'invalid' });
    });

    const [state] = result.current;
    expect(state.error).toBe('Action failed');
  });

  it('should clear error', async () => {
    const error = new Error('Test error');
    (mockApiClient.createGame as any).mockRejectedValue(error);

    const { result } = renderHook(() => useGameState(mockApiClient));
    const [, actions] = result.current;

    // Trigger an error
    await act(async () => {
      await actions.createGame('player-456', 'story-789');
    });

    expect(result.current[0].error).toBe('Test error');

    // Clear the error
    act(() => {
      actions.clearError();
    });

    expect(result.current[0].error).toBeNull();
  });

  it('should delete game and reset state', async () => {
    const mockSession = { id: 'game-123', playerId: 'player-456' };
    (mockApiClient.createGame as any).mockResolvedValue(mockSession);
    (mockApiClient.deleteGame as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useGameState(mockApiClient));
    const [, actions] = result.current;

    // First create a game
    await act(async () => {
      await actions.createGame('player-456', 'story-789');
    });

    expect(result.current[0].session).toEqual(mockSession);

    // Then delete the game
    await act(async () => {
      await actions.deleteGame();
    });

    const [state] = result.current;
    expect(state.session).toBeNull();
    expect(mockApiClient.deleteGame).toHaveBeenCalledWith('game-123');
  });
});
