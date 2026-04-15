import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { GameSession } from '../../services/GameSessionService';
import { ActionResponse } from '../../types/game';
import { GameAPIClient } from '../GameAPIClient';
import { WebSocketClient } from '../WebSocketClient';
import { useAppContext } from '../contexts';
import { TextInput } from './TextInput';
import { Panel } from './Layout';
import { clientConfig } from '../config';

interface GameScreenProps {
  gameSession: GameSession;
  apiClient: GameAPIClient;
  onExit: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ gameSession, apiClient, onExit }) => {
  const { state } = useAppContext();
  const { theme } = state;
  const [currentSession, setCurrentSession] = useState(gameSession);
  const [loading, setLoading] = useState(false);
  const [, setWsClient] = useState<WebSocketClient | null>(null);

  useEffect(() => {
    const client = new WebSocketClient(
      clientConfig.wsUrl, 
      (update: any) => {
        setCurrentSession(prev => ({ ...prev, ...update }));
      },
      () => {
        // Connection status is handled by parent component
      },
      {
        reconnectInterval: 2000,
        maxReconnectAttempts: 10,
        heartbeatInterval: 25000,
      }
    );
    client.connect();
    setWsClient(client);

    return () => {
      client.disconnect();
    };
  }, []);

  // Input handling is now done by TextInput component

  const handleAction = async (action: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const response: ActionResponse = await apiClient.processAction(currentSession.id, {
        type: 'text',
        content: action,
        playerId: currentSession.playerId,
      });

      if (response) {
        // Session will be updated via WebSocket
        console.log('Action processed:', response);
      }
    } catch (error) {
      console.error('Failed to process action:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentBeat = (currentSession as any).story?.beats?.[(currentSession as any).currentBeatId || 0];

  return (
    <Box flexDirection="column" height="100%">
      {/* Story Content */}
      <Panel title="Story" flexGrow={1} padding={1}>
        {currentBeat ? (
          <Box flexDirection="column">
            <Text>
              {currentBeat.description}
            </Text>
            {currentBeat.choices && currentBeat.choices.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={theme.colors.secondary} bold>Available choices:</Text>
                {currentBeat.choices.map((choice: any, index: number) => (
                  <Text key={index} color={theme.colors.muted}>
                    {index + 1}. {choice.text}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Text color={theme.colors.muted}>Loading story content...</Text>
        )}
      </Panel>

      {/* Input Area */}
      <Box paddingX={1} paddingY={1}>
        <TextInput
          placeholder={loading ? "Processing..." : "What do you do?"}
          onSubmit={handleAction}
          onCancel={onExit}
          disabled={loading}
          prefix={loading ? "[WAIT] " : "> "}
          maxLength={500}
        />
      </Box>
    </Box>
  );
};