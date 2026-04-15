import { useState, useEffect, useCallback } from 'react';
import { GameSession } from '../../services/GameSessionService';
import { ActionResponse } from '../../types/game';
import { GameAPIClient } from '../GameAPIClient';
import { WebSocketClient } from '../WebSocketClient';
import { clientConfig } from '../config';

export interface GameState {
  session: GameSession | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
}

export interface GameActions {
  createGame: (playerId: string, storyId: string) => Promise<void>;
  loadGame: (gameId: string, playerId: string) => Promise<void>;
  processAction: (action: any) => Promise<ActionResponse | null>;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;
  saveGame: (saveName: string) => Promise<void>;
  deleteGame: () => Promise<void>;
  clearError: () => void;
}

export const useGameState = (apiClient: GameAPIClient): [GameState, GameActions] => {
  const [state, setState] = useState<GameState>({
    session: null,
    loading: false,
    error: null,
    connected: false,
  });

  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);

  useEffect(() => {
    return () => {
      wsClient?.disconnect();
    };
  }, [wsClient]);

  const handleSessionUpdate = useCallback((update: any) => {
    setState(prev => ({
      ...prev,
      session: prev.session ? { ...prev.session, ...update } : null,
    }));
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setState(prev => ({ ...prev, connected }));
  }, []);

  const createGame = useCallback(async (playerId: string, storyId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const session = await apiClient.createGame(playerId, storyId);
      setState(prev => ({ ...prev, session, loading: false }));
      
      // Connect WebSocket for real-time updates
      const client = new WebSocketClient(
        clientConfig.wsUrl,
        handleSessionUpdate,
        handleConnectionChange
      );
      client.connect();
      setWsClient(client);
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to create game' 
      }));
    }
  }, [apiClient, handleSessionUpdate, handleConnectionChange]);

  const loadGame = useCallback(async (gameId: string, playerId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const session = await apiClient.getGame(gameId, playerId);
      setState(prev => ({ ...prev, session, loading: false }));
      
      // Connect WebSocket for real-time updates
      const client = new WebSocketClient(
        clientConfig.wsUrl,
        handleSessionUpdate,
        handleConnectionChange
      );
      client.connect();
      setWsClient(client);
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load game' 
      }));
    }
  }, [apiClient, handleSessionUpdate, handleConnectionChange]);

  const processAction = useCallback(async (action: any): Promise<ActionResponse | null> => {
    if (!state.session) return null;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiClient.processAction(state.session.id, action);
      setState(prev => ({ ...prev, loading: false }));
      return response;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to process action' 
      }));
      return null;
    }
  }, [apiClient, state.session]);

  const pauseGame = useCallback(async () => {
    if (!state.session) return;
    
    try {
      await apiClient.pauseGame(state.session.id, state.session.playerId);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to pause game' 
      }));
    }
  }, [apiClient, state.session]);

  const resumeGame = useCallback(async () => {
    if (!state.session) return;
    
    try {
      await apiClient.resumeGame(state.session.id, state.session.playerId);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to resume game' 
      }));
    }
  }, [apiClient, state.session]);

  const saveGame = useCallback(async (saveName: string) => {
    if (!state.session) return;
    
    try {
      await apiClient.saveGame(state.session.id, state.session.playerId, saveName);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to save game' 
      }));
    }
  }, [apiClient, state.session]);

  const deleteGame = useCallback(async () => {
    if (!state.session) return;
    
    try {
      await apiClient.deleteGame(state.session.id, state.session.playerId);
      setState(prev => ({ ...prev, session: null }));
      wsClient?.disconnect();
      setWsClient(null);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete game' 
      }));
    }
  }, [apiClient, state.session, wsClient]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return [
    state,
    {
      createGame,
      loadGame,
      processAction,
      pauseGame,
      resumeGame,
      saveGame,
      deleteGame,
      clearError,
    }
  ];
};