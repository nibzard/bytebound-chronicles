import React from 'react';
import { render } from 'ink-testing-library';
import { MainMenu } from '../../../../src/client/components/MainMenu';
import { GameAPIClient } from '../../../../src/client/GameAPIClient';
import { AppProvider } from '../../../../src/client/contexts/AppContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const renderWithContext = (component: React.ReactElement) => {
  return render(<AppProvider>{component}</AppProvider>);
};

describe('MainMenu', () => {
  let mockApiClient: GameAPIClient;

  beforeEach(() => {
    mockApiClient = {
      getStoryCatalog: vi.fn(),
    } as any;
  });

  it('should display loading message initially', () => {
    const { lastFrame } = renderWithContext(
      <MainMenu 
        apiClient={mockApiClient}
        onStartGame={vi.fn()}
        onExit={vi.fn()}
      />
    );

    expect(lastFrame()).toContain('Loading stories...');
  });

  it('should display story catalog when loaded', async () => {
    const mockCatalog = {
      stories: [
        {
          id: 'test-story',
          title: 'Test Story',
          description: 'A test story',
          genre: ['fantasy'],
          difficulty: 'medium',
          estimatedPlaytime: 30,
        },
      ],
    };

    (mockApiClient.getStoryCatalog as any).mockResolvedValue(mockCatalog);

    const { lastFrame, rerender } = renderWithContext(
      <MainMenu 
        apiClient={mockApiClient}
        onStartGame={vi.fn()}
        onExit={vi.fn()}
      />
    );

    // Wait for async loading to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    rerender(<AppProvider><MainMenu 
      apiClient={mockApiClient}
      onStartGame={vi.fn()}
      onExit={vi.fn()}
    /></AppProvider>);

    expect(lastFrame()).toContain('Test Story');
    expect(lastFrame()).toContain('A test story');
  });

  it('should display error message when loading fails', async () => {
    (mockApiClient.getStoryCatalog as any).mockRejectedValue(new Error('Network error'));

    const { lastFrame, rerender } = renderWithContext(
      <MainMenu 
        apiClient={mockApiClient}
        onStartGame={vi.fn()}
        onExit={vi.fn()}
      />
    );

    // Wait for async loading to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    rerender(<AppProvider><MainMenu 
      apiClient={mockApiClient}
      onStartGame={vi.fn()}
      onExit={vi.fn()}
    /></AppProvider>);

    expect(lastFrame()).toContain('No stories available');
  });
});
