import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../contexts';

interface LoadingScreenProps {
  message?: string;
  showSpinner?: boolean;
  spinnerType?: 'dots' | 'bars' | 'clock' | 'bounce';
}

const SPINNER_FRAMES = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  bars: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'],
  clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
  bounce: ['●    ', ' ●   ', '  ●  ', '   ● ', '    ●', '   ● ', '  ●  ', ' ●   ']
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  showSpinner = true,
  spinnerType = 'dots'
}) => {
  const { state } = useAppContext();
  const { theme } = state;
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const [dotsFrame, setDotsFrame] = useState(0);
  const spinnerFrames = SPINNER_FRAMES[spinnerType];

  useEffect(() => {
    if (!showSpinner) return;

    const interval = setInterval(() => {
      setSpinnerFrame(prev => (prev + 1) % spinnerFrames.length);
    }, spinnerType === 'bounce' ? 200 : 100);

    return () => clearInterval(interval);
  }, [showSpinner, spinnerFrames.length, spinnerType]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotsFrame(prev => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box justifyContent="center" alignItems="center" height="100%">
      <Box flexDirection="column" alignItems="center">
        {showSpinner && (
          <Box marginBottom={1}>
            <Text color={theme.colors.primary}>
              {spinnerFrames[spinnerFrame]}
            </Text>
          </Box>
        )}
        <Text color={theme.colors.info}>{message}</Text>
        
        {/* Loading dots animation */}
        <Box marginTop={1}>
          <Text color={theme.colors.muted}>
            {'.'.repeat(dotsFrame + 1).padEnd(3, ' ')}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};