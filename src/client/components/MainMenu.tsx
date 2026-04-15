import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { StoryCatalog } from '../../services/StoryMetadataService';
import { GameAPIClient } from '../GameAPIClient';
import { useKeyboard, useListNavigation } from '../hooks';
import { useAppContext } from '../contexts';

interface MainMenuProps {
  apiClient: GameAPIClient;
  onStartGame: (storyId: string, playerId: string) => void;
  onExit: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ apiClient, onStartGame, onExit }) => {
  const { state } = useAppContext();
  const { theme } = state;
  const [storyCatalog, setStoryCatalog] = useState<StoryCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerId] = useState(() => `player-${Date.now()}`);

  const { selectedIndex, handlers: navigationHandlers } = useListNavigation(
    storyCatalog?.stories.length || 0
  );

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const catalog = await apiClient.getStoryCatalog();
      setStoryCatalog(catalog);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (storyCatalog && storyCatalog.stories[selectedIndex]) {
      const selectedStory = storyCatalog.stories[selectedIndex];
      onStartGame(selectedStory.id, playerId);
    }
  };

  useKeyboard({
    ...navigationHandlers,
    onEnter: handleSelect,
    onEscape: onExit,
  }, { enabled: !loading });

  if (loading) {
    return (
      <Box justifyContent="center" alignItems="center" height="100%">
        <Text color={theme.colors.info}>Loading stories...</Text>
      </Box>
    );
  }

  if (!storyCatalog || storyCatalog.stories.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" height="100%">
        <Box flexDirection="column" alignItems="center">
          <Text color={theme.colors.danger}>No stories available</Text>
          <Text color={theme.colors.muted}>Press ESC to exit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box justifyContent="center" paddingY={1}>
        <Text color={theme.colors.primary} bold>
          📖 BYTEBOUND CHRONICLES 📖
        </Text>
      </Box>

      <Box justifyContent="center" paddingBottom={2}>
        <Text color={theme.colors.muted}>
          Select a story to begin your adventure
        </Text>
      </Box>

      {/* Story List */}
      <Box flexDirection="column" flexGrow={1} paddingX={2}>
        {storyCatalog.stories.map((story, index) => (
          <Box key={story.id} marginBottom={1}>
            <Box
              borderStyle={index === selectedIndex ? 'single' : undefined}
              borderColor={index === selectedIndex ? theme.colors.primary : undefined}
              paddingX={1}
              width="100%"
            >
              <Box flexDirection="column">
                <Text color={index === selectedIndex ? theme.colors.primary : theme.colors.text} bold>
                  {story.title}
                </Text>
                <Text color={theme.colors.muted}>
                  {story.description}
                </Text>
                <Box marginTop={1}>
                  <Text color={theme.colors.secondary}>Difficulty: </Text>
                  <Text color={theme.colors.muted}>{story.difficulty}</Text>
                  {story.estimatedLength && (
                    <>
                      <Text color={theme.colors.secondary}> • Time: </Text>
                      <Text color={theme.colors.muted}>{story.estimatedLength}min</Text>
                    </>
                  )}
                </Box>
                {story.contentWarnings && story.contentWarnings.length > 0 && (
                  <Box marginTop={1}>
                    <Text color={theme.colors.danger}>⚠️ </Text>
                    <Text color={theme.colors.muted}>{story.contentWarnings.join(', ')}</Text>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Help */}
      <Box borderStyle="single" paddingX={1}>
        <Text color={theme.colors.muted}>
          ↑↓ Navigate • Enter to select • ESC to exit
        </Text>
      </Box>
    </Box>
  );
};