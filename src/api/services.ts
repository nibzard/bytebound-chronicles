import { GameSessionService } from '../services/GameSessionService';
import { StoryMetadataService } from '../services/StoryMetadataService';
import { ProgressiveStoryLoader } from '../services/ProgressiveStoryLoader';
import { StoryValidationService } from '../services/StoryValidationService';
import { HybridDatabase, defaultHybridConfig } from '../database/HybridDatabase';

// Instantiate dependencies
export const db = new HybridDatabase(defaultHybridConfig);

export const storyMetadataService = new StoryMetadataService({
  storiesDirectory: './stories',
  enableCaching: true,
  cacheExpiryMinutes: 60,
  autoValidateStories: true,
  database: db,
});

export const storyValidationService = new StoryValidationService({
    metadataService: storyMetadataService,
    database: db,
    enableContentAnalysis: true,
    enableBalanceChecking: true,
    enableAccessibilityChecks: true,
    strictMode: false,
    customRules: [],
});

export const progressiveStoryLoader = new ProgressiveStoryLoader({
    metadataService: storyMetadataService,
    database: db,
    enableSpoilerPrevention: true,
    maxLookaheadBeats: 3,
    enableProgressCaching: true,
    cacheExpiryMinutes: 60,
});


export const gameSessionService = new GameSessionService({
  metadataService: storyMetadataService,
  storyLoader: progressiveStoryLoader,
  validationService: storyValidationService,
  database: db,
  sessionTimeout: 60,
  autoSaveInterval: 5,
  maxConcurrentSessions: 5,
  enableRealTimeUpdates: true,
  aiResponseTimeout: 30,
});
