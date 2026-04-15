import React, { ReactNode } from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from '../contexts';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showStatus?: boolean;
  showHelp?: boolean;
  helpContent?: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  showStatus = false, 
  showHelp = false, 
  helpContent 
}) => {
  const { state } = useAppContext();
  const { theme, connected, error } = state;

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Header */}
      {title && (
        <Box borderStyle={theme.borders.single} paddingX={1}>
          <Text color={theme.colors.primary} bold>
            {title}
          </Text>
        </Box>
      )}

      {/* Status Bar */}
      {showStatus && (
        <Box justifyContent="space-between" paddingX={1}>
          <Box>
            <Text color={theme.colors.muted}>
              Status: {connected ? (
                <Text color={theme.colors.success}>🟢 Connected</Text>
              ) : (
                <Text color={theme.colors.danger}>🔴 Disconnected</Text>
              )}
            </Text>
          </Box>
          <Box>
            <Text color={theme.colors.muted}>
              {new Date().toLocaleTimeString()}
            </Text>
          </Box>
        </Box>
      )}

      {/* Main Content Area */}
      <Box flexGrow={1} flexDirection="column">
        {children}
      </Box>

      {/* Error Display */}
      {error && (
        <Box borderStyle={theme.borders.single} borderColor={theme.colors.danger} paddingX={1}>
          <Text color={theme.colors.danger}>⚠️ {error}</Text>
        </Box>
      )}

      {/* Help Bar */}
      {showHelp && helpContent && (
        <Box borderStyle={theme.borders.single} paddingX={1}>
          <Text color={theme.colors.muted} dimColor>
            {helpContent}
          </Text>
        </Box>
      )}
    </Box>
  );
};

interface PanelProps {
  children: ReactNode;
  title?: string;
  border?: boolean;
  borderColor?: string;
  padding?: number;
  flexGrow?: number;
  width?: number | string;
  height?: number | string;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  title,
  border = false,
  borderColor,
  padding = 0,
  flexGrow = 0,
  width = '100%',
  height = '100%',
}) => {
  const { state } = useAppContext();
  const { theme } = state;

  return (
    <Box
      flexDirection="column"
      borderStyle={border ? theme.borders.single : undefined}
      borderColor={borderColor || theme.colors.border}
      paddingX={padding}
      paddingY={padding}
      flexGrow={flexGrow}
      width={width}
      height={height}
    >
      {title && (
        <Box marginBottom={1}>
          <Text color={theme.colors.secondary} bold>
            {title}
          </Text>
        </Box>
      )}
      {children}
    </Box>
  );
};

interface ScrollableListProps<T> {
  items: T[];
  selectedIndex: number;
  renderItem: (item: T, index: number, isSelected: boolean) => ReactNode;
  maxVisibleItems?: number;
  showScrollIndicators?: boolean;
}

export function ScrollableList<T>({
  items,
  selectedIndex,
  renderItem,
  maxVisibleItems = 10,
  showScrollIndicators = true,
}: ScrollableListProps<T>) {
  const { state } = useAppContext();
  const { theme } = state;

  const totalItems = items.length;
  const visibleStart = Math.max(0, selectedIndex - Math.floor(maxVisibleItems / 2));
  const visibleEnd = Math.min(totalItems, visibleStart + maxVisibleItems);
  const visibleItems = items.slice(visibleStart, visibleEnd);

  const canScrollUp = visibleStart > 0;
  const canScrollDown = visibleEnd < totalItems;

  return (
    <Box flexDirection="column" width="100%">
      {/* Scroll Up Indicator */}
      {showScrollIndicators && canScrollUp && (
        <Box justifyContent="center">
          <Text color={theme.colors.muted}>↑ More items above ↑</Text>
        </Box>
      )}

      {/* Visible Items */}
      <Box flexDirection="column">
        {visibleItems.map((item, index) => {
          const actualIndex = visibleStart + index;
          const isSelected = actualIndex === selectedIndex;
          return (
            <Box key={actualIndex}>
              {renderItem(item, actualIndex, isSelected)}
            </Box>
          );
        })}
      </Box>

      {/* Scroll Down Indicator */}
      {showScrollIndicators && canScrollDown && (
        <Box justifyContent="center">
          <Text color={theme.colors.muted}>↓ More items below ↓</Text>
        </Box>
      )}

      {/* Status */}
      {showScrollIndicators && totalItems > maxVisibleItems && (
        <Box justifyContent="center" marginTop={1}>
          <Text color={theme.colors.muted}>
            {selectedIndex + 1} of {totalItems}
          </Text>
        </Box>
      )}
    </Box>
  );
}