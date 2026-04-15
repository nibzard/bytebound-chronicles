import React, { useState, useEffect } from 'react';
import { GameAPIClient } from './GameAPIClient';
import { MainMenu, GameScreen, LoadingScreen, ErrorScreen } from './components';
import { AppProvider, useAppContext } from './contexts';
import { useAppActions } from './hooks';
import { clientConfig } from './config';

const TerminalClientInner: React.FC = () => {
  const { state } = useAppContext();
  const [apiClient] = useState(() => new GameAPIClient(clientConfig.apiUrl));
  const actions = useAppActions(apiClient);

  useEffect(() => {
    actions.initializeApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartGame = async (storyId: string, playerId: string) => {
    await actions.startGame(storyId, playerId);
  };

  const handleExitGame = () => {
    actions.exitGame();
  };

  const handleExit = () => {
    actions.exitApp();
  };

  const handleRetry = () => {
    actions.retryConnection();
  };

  const renderCurrentState = () => {
    switch (state.appState) {
      case 'loading':
        return (
          <LoadingScreen 
            message={state.loading ? 'Starting game...' : 'Connecting to server...'} 
          />
        );

      case 'menu':
        return (
          <MainMenu 
            apiClient={apiClient}
            onStartGame={handleStartGame}
            onExit={handleExit}
          />
        );

      case 'game':
        if (!state.gameSession) {
          return <LoadingScreen message="Loading game session..." />;
        }
        return (
          <GameScreen 
            gameSession={state.gameSession}
            apiClient={apiClient}
            onExit={handleExitGame}
          />
        );

      case 'error':
        return (
          <ErrorScreen 
            title="Connection Error"
            error={state.error || 'An unknown error occurred'}
            onRetry={handleRetry}
            onExit={handleExit}
          />
        );

      default:
        return <LoadingScreen message="Unknown state" />;
    }
  };

  return renderCurrentState();
};

export const TerminalClient: React.FC = () => {
  return (
    <AppProvider>
      <TerminalClientInner />
    </AppProvider>
  );
};