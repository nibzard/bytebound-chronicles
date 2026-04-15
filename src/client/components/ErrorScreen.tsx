import React from 'react';
import { Box, Text } from 'ink';
import { useKeyboard } from '../hooks';
import { useAppContext } from '../contexts';
import { Panel } from './Layout';

interface ErrorScreenProps {
  title?: string;
  error: string;
  details?: string;
  onRetry?: () => void;
  onExit: () => void;
  showHelp?: boolean;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ 
  title = 'Error', 
  error, 
  details, 
  onRetry, 
  onExit,
  showHelp = true
}) => {
  const { state } = useAppContext();
  const { theme } = state;

  useKeyboard({
    onEscape: onExit,
    onChar: (char) => {
      if (char === 'r' && onRetry) {
        onRetry();
      }
    },
  });

  return (
    <Box justifyContent="center" alignItems="center" height="100%">
      <Panel 
        border
        borderColor={theme.colors.danger}
        padding={2}
        title={`❌ ${title}`}
      >
        <Box flexDirection="column" alignItems="center" width={60}>
          <Text color={theme.colors.text}>
            {error}
          </Text>
          
          {details && (
            <Text color={theme.colors.muted}>
              {details}
            </Text>
          )}
          
          {showHelp && (
            <Box marginTop={2} flexDirection="column" alignItems="center">
              <Box>
                {onRetry && (
                  <Text color={theme.colors.warning}>
                    Press 'r' to retry
                  </Text>
                )}
                {onRetry && (
                  <Text color={theme.colors.muted}> • </Text>
                )}
                <Text color={theme.colors.muted}>
                  ESC to exit
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </Panel>
    </Box>
  );
};