import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts';
import { GameAPIClient } from '../GameAPIClient';
import { WebSocketClient } from '../WebSocketClient';
import { clientConfig } from '../config';

export const useAppActions = (apiClient: GameAPIClient) => {
  const { state, dispatch } = useAppContext();
  const gameSessionRef = useRef(state.gameSession);
  
  useEffect(() => {
    gameSessionRef.current = state.gameSession;
  }, [state.gameSession]);

  const setAppState = useCallback((appState: 'menu' | 'game' | 'loading' | 'error') => {
    dispatch({ type: 'SET_APP_STATE', payload: appState });
  }, [dispatch]);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, [dispatch]);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, [dispatch]);

  const setConnected = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_CONNECTED', payload: connected });
  }, [dispatch]);

  const testConnection = useCallback(async () => {
    try {
      await fetch(`${clientConfig.apiUrl}/health`);
      return true;
    } catch {
      return false;
    }
  }, []);

  const initializeApp = useCallback(async () => {
    setAppState('loading');
    clearError();
    
    try {
      const isConnected = await testConnection();
      if (isConnected) {
        setAppState('menu');
      } else {
        setError(`Failed to connect to game server at ${clientConfig.apiUrl}. Please ensure the server is running.`);
        setAppState('error');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
      setAppState('error');
    }
  }, [setAppState, clearError, setError, testConnection]);

  const startGame = useCallback(async (storyId: string, playerId: string) => {
    setAppState('loading');
    setLoading(true);
    clearError();

    try {
      const session = await apiClient.createGame(playerId, storyId);
      dispatch({ type: 'SET_GAME_SESSION', payload: session });
      
      // Connect WebSocket for real-time updates
      const wsClient = new WebSocketClient(
        clientConfig.wsUrl,
        (update) => {
          dispatch({ type: 'UPDATE_GAME_SESSION', payload: update as any });
        },
        setConnected,
        {
          reconnectInterval: 2000,
          maxReconnectAttempts: 10,
          heartbeatInterval: 25000,
        }
      );
      wsClient.connect();
      
      setAppState('game');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start game');
      setAppState('error');
    } finally {
      setLoading(false);
    }
  }, [apiClient, dispatch, setAppState, setLoading, clearError, setError, setConnected]);

  const exitGame = useCallback(async () => {
    const currentSession = gameSessionRef.current;
    if (currentSession) {
      try {
        await apiClient.deleteGame(currentSession.id, currentSession.playerId);
      } catch (error) {
        console.error('Failed to delete game session:', error);
      }
    }
    
    dispatch({ type: 'SET_GAME_SESSION', payload: null });
    setAppState('menu');
  }, [apiClient, dispatch, setAppState]);

  const exitApp = useCallback(() => {
    process.exit(0);
  }, []);

  const retryConnection = useCallback(async () => {
    clearError();
    await initializeApp();
  }, [clearError, initializeApp]);

  return useMemo(() => ({
    setAppState,
    setLoading,
    setError,
    clearError,
    setConnected,
    testConnection,
    initializeApp,
    startGame,
    exitGame,
    exitApp,
    retryConnection,
  }), [
    setAppState,
    setLoading,
    setError,
    clearError,
    setConnected,
    testConnection,
    initializeApp,
    startGame,
    exitGame,
    exitApp,
    retryConnection,
  ]);
};