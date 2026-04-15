import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameSession } from '../../services/GameSessionService';
import { Theme, defaultTheme } from '../themes';

export type AppState = 'menu' | 'game' | 'loading' | 'error';

export interface AppContextState {
  appState: AppState;
  gameSession: GameSession | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
  theme: Theme;
}

export type AppAction =
  | { type: 'SET_APP_STATE'; payload: AppState }
  | { type: 'SET_GAME_SESSION'; payload: GameSession | null }
  | { type: 'UPDATE_GAME_SESSION'; payload: Partial<GameSession> }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_THEME'; payload: Theme };

const initialState: AppContextState = {
  appState: 'loading',
  gameSession: null,
  connected: false,
  loading: false,
  error: null,
  theme: defaultTheme,
};

function appReducer(state: AppContextState, action: AppAction): AppContextState {
  switch (action.type) {
    case 'SET_APP_STATE':
      return { ...state, appState: action.payload };
    case 'SET_GAME_SESSION':
      return { ...state, gameSession: action.payload };
    case 'UPDATE_GAME_SESSION':
      return { 
        ...state, 
        gameSession: state.gameSession ? { ...state.gameSession, ...action.payload } : null 
      };
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppContextState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};