# Bytebound Chronicles
## Terminal LLM Adventure Game - Complete Developer Specification (Revised)

## Table of Contents
1. [Product Definition](#product-definition)
2. [Job-to-be-Done Analysis](#job-to-be-done-analysis)
3. [API-First Architecture](#api-first-architecture)
4. [Multi-Model AI Strategy](#multi-model-ai-strategy)
5. [Hybrid Database Design](#hybrid-database-design)
6. [TDD Implementation Plan](#tdd-implementation-plan)
7. [Story Management System](#story-management-system)
8. [Core API Specification](#core-api-specification)
9. [TUI Interface Implementation](#tui-interface-implementation)
10. [Development Roadmap](#development-roadmap)

---

## Product Definition

### One-Liner
**"An API-first adventure game engine that orchestrates multiple AI models for intelligent narrative generation, with a terminal interface as the primary client, designed for extensibility to web, voice, and multiplayer interfaces."**

### Core Value Proposition
- **API-First Design**: Game logic separated from interface for multiple client support
- **Intelligent Model Orchestration**: Right AI model for each task with automatic escalation
- **Spoiler-Free Story Loading**: Players discover stories naturally without metadata exposure
- **Hybrid Persistence**: LMDB for gameplay context + SQLite for structured data + Turso for cloud sync
- **Test-Driven Development**: Comprehensive test coverage from day one
- **Multi-Interface Ready**: Terminal now, web/voice/multiplayer later

---

## Job-to-be-Done Analysis

### Primary JTBD
**"When I want to experience dynamic interactive stories, I want an intelligent system that understands my intent, adapts to my play style, and provides consistent narratives across different interfaces, so that I can enjoy seamless storytelling without technical friction or spoilers."**

### Enhanced User Personas

#### Primary: API-First Developers (40%)
- **Demographics**: 25-40 years old, full-stack developers, API-first mindset
- **Pain Points**: Monolithic game architectures, limited extensibility
- **Motivations**: Building on solid foundations, learning modern AI integration
- **Technical Needs**: Clean APIs, comprehensive documentation, extensible architecture

#### Secondary: AI Enthusiasts (35%)
- **Demographics**: 20-35 years old, experimenting with LLM applications
- **Pain Points**: Single-model limitations, poor error handling in AI apps
- **Motivations**: Understanding multi-model orchestration, intelligent escalation
- **Technical Needs**: Transparent AI decision-making, model performance metrics

#### Tertiary: Game Developers (25%)
- **Demographics**: 25-45 years old, indie game creators, narrative designers
- **Pain Points**: Complex narrative engines, spoiler management challenges
- **Motivations**: Creating engaging stories, managing player experience
- **Technical Needs**: Story authoring tools, player analytics, narrative control

---

## API-First Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────┐
│                    Client Interfaces                    │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│    │  Terminal   │  │    Web      │  │   Voice     │   │
│    │     TUI     │  │    App      │  │   Client    │   │
│    └─────────────┘  └─────────────┘  └─────────────┘   │
├─────────────────────────────────────────────────────────┤
│                    Game API Gateway                     │
│               (Express + WebSocket)                     │
├─────────────────────────────────────────────────────────┤
│                  Core Game Services                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Story      │  │   Player     │  │    AI        │  │
│  │  Service     │  │   Service    │  │ Orchestrator │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                  Persistence Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    LMDB      │  │   SQLite     │  │    Turso     │  │
│  │ (Gameplay)   │  │ (Structured) │  │ (Cloud Sync) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Core API Framework
```json
{
  "runtime": "Node.js 20+ (ESM)",
  "framework": "Fastify 4.x (high performance)",
  "language": "TypeScript 5.0+",
  "validation": "Zod + Fastify schema validation",
  "testing": "Vitest + Supertest",
  "documentation": "OpenAPI 3.0 + Swagger UI"
}
```

#### Dependencies
```json
{
  "dependencies": {
    "fastify": "^4.24.3",
    "@fastify/websocket": "^8.3.1",
    "@fastify/swagger": "^8.12.0",
    "@google/generative-ai": "^0.2.1",
    "@anthropic-ai/sdk": "^0.24.3",
    "lmdb": "^2.8.5",
    "better-sqlite3": "^9.2.2",
    "@libsql/client": "^0.4.3",
    "zod": "^3.22.4",
    "nanoid": "^5.0.4",
    "pino": "^8.16.2"
  },
  "devDependencies": {
    "vitest": "^1.0.4",
    "supertest": "^6.3.3",
    "@types/node": "^20.10.4",
    "typescript": "^5.3.3",
    "tsx": "^4.6.2"
  },
  "tui-client": {
    "ink": "^4.4.1",
    "react": "^18.2.0",
    "chalk": "^5.3.0",
    "boxen": "^7.1.1"
  }
}
```

---

## Multi-Model AI Strategy

### Model Assignment Strategy
```typescript
interface ModelAssignment {
  primary: 'gemini-2.0-flash-exp';
  reasoning: 'gemini-2.0-thinking-exp';
  function_calling: 'gemini-2.0-flash-exp';
  escalation: ['gemini-exp-1206', 'claude-3-5-sonnet-20241022'];
  fallback: 'gemini-1.5-flash';
}

enum AITaskType {
  INTENT_DETECTION = 'intent_detection',
  NARRATIVE_GENERATION = 'narrative_generation',
  STORY_REASONING = 'story_reasoning',
  FRUSTRATION_ANALYSIS = 'frustration_analysis',
  WORLD_BUILDING = 'world_building',
  CHARACTER_DIALOGUE = 'character_dialogue'
}

interface EscalationTrigger {
  type: 'user_frustration' | 'story_complexity' | 'model_failure' | 'explicit_request';
  threshold: number;
  cooldown: number; // seconds before re-escalation allowed
}
```

### AI Orchestration System
```typescript
export class AIOrchestrator {
  private models = new Map<string, AIModel>();
  private escalationTracker = new Map<string, EscalationState>();
  private frustrationDetector: FrustrationDetector;
  private usageMetrics: UsageMetrics;

  constructor(private config: AIConfig) {
    this.initializeModels();
    this.frustrationDetector = new FrustrationDetector();
    this.usageMetrics = new UsageMetrics();
  }

  async processRequest(
    taskType: AITaskType,
    context: GameContext,
    playerId: string
  ): Promise<AIResponse> {
    // 1. Determine optimal model for task
    const modelChoice = await this.selectModel(taskType, context, playerId);

    // 2. Check escalation conditions
    const shouldEscalate = await this.checkEscalation(context, playerId);

    // 3. Execute request with selected model
    const response = await this.executeRequest(
      modelChoice,
      taskType,
      context,
      shouldEscalate
    );

    // 4. Track metrics and update escalation state
    await this.updateMetrics(response, playerId);

    return response;
  }

  private async selectModel(
    taskType: AITaskType,
    context: GameContext,
    playerId: string
  ): Promise<ModelChoice> {
    const baseAssignment = this.getBaseModelForTask(taskType);
    const playerHistory = await this.getPlayerHistory(playerId);
    const currentComplexity = this.assessComplexity(context);

    // Use thinking model for complex reasoning tasks
    if (taskType === AITaskType.STORY_REASONING && currentComplexity > 0.7) {
      return {
        primary: 'gemini-2.0-thinking-exp',
        fallback: baseAssignment.primary,
        reasoning: 'High complexity story decision'
      };
    }

    // Use function calling optimized model for intent detection
    if (taskType === AITaskType.INTENT_DETECTION) {
      return {
        primary: 'gemini-2.0-flash-exp',
        mode: 'function_calling',
        reasoning: 'Structured intent parsing required'
      };
    }

    return baseAssignment;
  }

  private async checkEscalation(
    context: GameContext,
    playerId: string
  ): Promise<EscalationDecision> {
    const frustrationLevel = await this.frustrationDetector.analyze(
      context.recentInteractions
    );

    const storyComplexity = this.assessStoryComplexity(context.currentBeat);
    const recentFailures = await this.getRecentFailures(playerId);

    // Escalate if user shows frustration
    if (frustrationLevel > 0.6) {
      return {
        shouldEscalate: true,
        reason: 'User frustration detected',
        targetModel: 'claude-3-5-sonnet-20241022', // Better at empathy
        duration: 300 // 5 minutes
      };
    }

    // Escalate for complex story situations
    if (storyComplexity > 0.8 && recentFailures > 2) {
      return {
        shouldEscalate: true,
        reason: 'Complex story situation with failures',
        targetModel: 'gemini-exp-1206', // Most capable reasoning
        duration: 180 // 3 minutes
      };
    }

    return { shouldEscalate: false };
  }
}
```

### Frustration Detection System
```typescript
export class FrustrationDetector {
  private patterns = [
    /^(what|why|how).*(supposed to|meant to)/i,
    /^(this is|that's)\s+(stupid|dumb|wrong|broken)/i,
    /^help$/i,
    /^(i don't|dont)\s+(understand|get it|know)/i,
    /^(stuck|confused|lost)/i
  ];

  async analyze(interactions: PlayerInteraction[]): Promise<number> {
    if (interactions.length < 3) return 0;

    const recentInteractions = interactions.slice(-5);
    let frustrationScore = 0;

    // Check for frustration patterns in text
    for (const interaction of recentInteractions) {
      if (this.containsFrustrationKeywords(interaction.input)) {
        frustrationScore += 0.3;
      }
    }

    // Check for repeated similar inputs (player stuck)
    const repetition = this.detectRepetition(recentInteractions);
    frustrationScore += repetition * 0.2;

    // Check for rapid successive inputs
    const rapidInputs = this.detectRapidInputs(recentInteractions);
    frustrationScore += rapidInputs * 0.1;

    return Math.min(frustrationScore, 1.0);
  }

  private containsFrustrationKeywords(input: string): boolean {
    return this.patterns.some(pattern => pattern.test(input));
  }

  private detectRepetition(interactions: PlayerInteraction[]): number {
    const inputs = interactions.map(i => i.input.toLowerCase().trim());
    const unique = new Set(inputs);
    return 1 - (unique.size / inputs.length);
  }

  private detectRapidInputs(interactions: PlayerInteraction[]): number {
    let rapidCount = 0;
    for (let i = 1; i < interactions.length; i++) {
      const timeDiff = interactions[i].timestamp - interactions[i-1].timestamp;
      if (timeDiff < 2000) { // Less than 2 seconds between inputs
        rapidCount++;
      }
    }
    return rapidCount / interactions.length;
  }
}
```

---

## Hybrid Database Design

### Database Architecture
```typescript
interface DatabaseLayer {
  lmdb: LMDBStore;      // High-performance gameplay data
  sqlite: SQLiteStore;  // Structured relational data
  turso: TursoStore;    // Cloud synchronization
}

// LMDB for high-frequency gameplay data
interface LMDBSchema {
  // Player interactions and context
  interactions: {
    key: `player:${playerId}:${timestamp}`;
    value: PlayerInteraction;
  };

  // AI responses and context
  ai_responses: {
    key: `response:${responseId}`;
    value: AIResponse;
  };

  // Game session context
  sessions: {
    key: `session:${sessionId}`;
    value: GameSession;
  };

  // Story progression tracking
  story_progress: {
    key: `progress:${playerId}:${storyId}`;
    value: StoryProgress;
  };
}

// SQLite for structured data
interface SQLiteSchema {
  players: {
    id: string;
    username: string;
    email?: string;
    created_at: Date;
    preferences: JSON;
  };

  stories: {
    id: string;
    title: string;
    description: string;
    file_path: string;
    version: string;
    created_at: Date;
  };

  game_saves: {
    id: string;
    player_id: string;
    story_id: string;
    save_name: string;
    game_state: JSON;
    created_at: Date;
  };

  analytics: {
    id: string;
    player_id: string;
    event_type: string;
    event_data: JSON;
    timestamp: Date;
  };
}
```

### Database Implementation
```typescript
import { open as openLMDB } from 'lmdb';
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';

export class HybridDatabase {
  private lmdb: any;
  private sqlite: Database.Database;
  private turso: any;

  constructor(private config: DatabaseConfig) {
    this.initializeDatabases();
  }

  private async initializeDatabases(): Promise<void> {
    // Initialize LMDB for high-performance reads/writes
    this.lmdb = openLMDB({
      path: this.config.lmdb.path,
      compression: true,
      cache: true,
      maxDbs: 10
    });

    // Initialize SQLite for structured queries
    this.sqlite = new Database(this.config.sqlite.path);
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('synchronous = NORMAL');
    this.sqlite.pragma('cache_size = 10000');

    // Initialize Turso for cloud sync (optional)
    if (this.config.turso.enabled) {
      this.turso = createClient({
        url: this.config.turso.url,
        authToken: this.config.turso.token
      });
    }

    await this.createTables();
  }

  // High-frequency gameplay operations use LMDB
  async storeInteraction(
    playerId: string,
    interaction: PlayerInteraction
  ): Promise<void> {
    const key = `player:${playerId}:${interaction.timestamp}`;
    await this.lmdb.put(key, interaction);

    // Async sync to cloud if enabled
    if (this.turso) {
      this.syncToCloud(key, interaction).catch(console.error);
    }
  }

  async getPlayerContext(
    playerId: string,
    limit: number = 50
  ): Promise<PlayerInteraction[]> {
    const startKey = `player:${playerId}:`;
    const endKey = `player:${playerId}:\xFF`;

    const interactions = [];
    for await (const { key, value } of this.lmdb.getRange({
      start: startKey,
      end: endKey,
      limit,
      reverse: true // Get most recent first
    })) {
      interactions.push(value);
    }

    return interactions;
  }

  // Structured queries use SQLite
  async saveGame(save: GameSave): Promise<void> {
    const stmt = this.sqlite.prepare(`
      INSERT OR REPLACE INTO game_saves
      (id, player_id, story_id, save_name, game_state, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      save.id,
      save.playerId,
      save.storyId,
      save.saveName,
      JSON.stringify(save.gameState),
      new Date().toISOString()
    );

    // Sync to cloud
    if (this.turso) {
      await this.turso.execute({
        sql: `INSERT OR REPLACE INTO game_saves
              (id, player_id, story_id, save_name, game_state, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [save.id, save.playerId, save.storyId, save.saveName,
               JSON.stringify(save.gameState), new Date().toISOString()]
      });
    }
  }

  async getPlayerSaves(playerId: string): Promise<GameSave[]> {
    const stmt = this.sqlite.prepare(`
      SELECT * FROM game_saves
      WHERE player_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(playerId).map(row => ({
      id: row.id,
      playerId: row.player_id,
      storyId: row.story_id,
      saveName: row.save_name,
      gameState: JSON.parse(row.game_state),
      createdAt: new Date(row.created_at)
    }));
  }

  // Analytics and metrics
  async trackEvent(
    playerId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    // Store in both LMDB (fast access) and SQLite (querying)
    const event = {
      id: nanoid(),
      playerId,
      eventType,
      eventData,
      timestamp: Date.now()
    };

    await this.lmdb.put(`event:${event.id}`, event);

    this.sqlite.prepare(`
      INSERT INTO analytics (id, player_id, event_type, event_data, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      event.id,
      playerId,
      eventType,
      JSON.stringify(eventData),
      new Date().toISOString()
    );
  }
}
```

---

## TDD Implementation Plan

### Test Structure Overview
```
tests/
├── unit/                     # Individual component tests
│   ├── ai/
│   │   ├── orchestrator.test.ts
│   │   ├── frustration-detector.test.ts
│   │   └── model-selector.test.ts
│   ├── database/
│   │   ├── hybrid-db.test.ts
│   │   ├── lmdb-store.test.ts
│   │   └── sqlite-store.test.ts
│   ├── game/
│   │   ├── story-service.test.ts
│   │   ├── player-service.test.ts
│   │   └── game-engine.test.ts
│   └── api/
│       ├── routes.test.ts
│       └── middleware.test.ts
├── integration/              # Service integration tests
│   ├── api-game-flow.test.ts
│   ├── ai-database.test.ts
│   └── story-loading.test.ts
├── e2e/                     # End-to-end tests
│   ├── complete-game.test.ts
│   └── multi-client.test.ts
├── fixtures/                # Test data
│   ├── stories/
│   └── players/
└── helpers/                 # Test utilities
    ├── mock-ai.ts
    ├── test-database.ts
    └── test-server.ts
```

### Test-First Development Examples

#### Story Service TDD Example
```typescript
// tests/unit/game/story-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StoryService } from '../../../src/services/StoryService';
import { createTestDatabase } from '../../helpers/test-database';

describe('StoryService', () => {
  let storyService: StoryService;
  let testDb: any;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    storyService = new StoryService(testDb, './tests/fixtures/stories');
  });

  describe('loadAvailableStories', () => {
    it('should load all story metadata without revealing content', async () => {
      const stories = await storyService.loadAvailableStories();

      expect(stories).toHaveLength(3);
      expect(stories[0]).toHaveProperty('id');
      expect(stories[0]).toHaveProperty('title');
      expect(stories[0]).toHaveProperty('description');
      expect(stories[0]).not.toHaveProperty('beats'); // No spoilers!
      expect(stories[0]).not.toHaveProperty('endings');
    });

    it('should filter stories by difficulty level', async () => {
      const beginnerStories = await storyService.loadAvailableStories({
        difficulty: 'beginner'
      });

      expect(beginnerStories).toHaveLength(1);
      expect(beginnerStories[0].metadata.difficulty).toBe('beginner');
    });
  });

  describe('initializeStory', () => {
    it('should create new game session with initial beat', async () => {
      const gameSession = await storyService.initializeStory(
        'test-story-1',
        'player-123'
      );

      expect(gameSession.storyId).toBe('test-story-1');
      expect(gameSession.playerId).toBe('player-123');
      expect(gameSession.currentBeat.act).toBe(1);
      expect(gameSession.currentBeat.isInitial).toBe(true);
    });

    it('should throw error for non-existent story', async () => {
      await expect(
        storyService.initializeStory('non-existent', 'player-123')
      ).rejects.toThrow('Story not found: non-existent');
    });
  });

  describe('getNextBeat', () => {
    it('should return valid next beats based on current state', async () => {
      const session = await storyService.initializeStory('test-story-1', 'player-123');

      // Simulate completing first beat objectives
      session.gameState.completedObjectives = ['enter_tavern', 'meet_bartender'];

      const nextBeats = await storyService.getNextBeats(session);

      expect(nextBeats).toHaveLength.greaterThan(0);
      expect(nextBeats[0].requirements).toBeDefined();
    });

    it('should not reveal future story content', async () => {
      const session = await storyService.initializeStory('test-story-1', 'player-123');
      const nextBeats = await storyService.getNextBeats(session);

      // Should only show immediate next options
      nextBeats.forEach(beat => {
        expect(beat.act).toBeLessThanOrEqual(session.currentBeat.act + 1);
        expect(beat).not.toHaveProperty('fullContent');
      });
    });
  });
});
```

#### AI Orchestrator TDD Example
```typescript
// tests/unit/ai/orchestrator.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIOrchestrator } from '../../../src/ai/AIOrchestrator';
import { mockGeminiResponse, mockClaudeResponse } from '../../helpers/mock-ai';

describe('AIOrchestrator', () => {
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    orchestrator = new AIOrchestrator({
      primary: 'gemini-2.0-flash-exp',
      escalation: ['gemini-exp-1206', 'claude-3-5-sonnet-20241022']
    });
  });

  describe('model selection', () => {
    it('should use reasoning model for complex story decisions', async () => {
      const context = {
        taskType: 'story_reasoning',
        complexity: 0.8,
        playerHistory: { frustrationLevel: 0.1 }
      };

      const modelChoice = await orchestrator.selectModel(context);

      expect(modelChoice.primary).toBe('gemini-2.0-thinking-exp');
      expect(modelChoice.reasoning).toContain('High complexity');
    });

    it('should use function calling model for intent detection', async () => {
      const context = {
        taskType: 'intent_detection',
        playerInput: 'I want to examine the mysterious door'
      };

      const modelChoice = await orchestrator.selectModel(context);

      expect(modelChoice.primary).toBe('gemini-2.0-flash-exp');
      expect(modelChoice.mode).toBe('function_calling');
    });
  });

  describe('escalation logic', () => {
    it('should escalate to empathetic model when frustration detected', async () => {
      const context = {
        recentInteractions: [
          { input: 'this is stupid', timestamp: Date.now() - 1000 },
          { input: 'i dont get it', timestamp: Date.now() - 500 },
          { input: 'help', timestamp: Date.now() }
        ]
      };

      const escalation = await orchestrator.checkEscalation(context, 'player-123');

      expect(escalation.shouldEscalate).toBe(true);
      expect(escalation.targetModel).toBe('claude-3-5-sonnet-20241022');
      expect(escalation.reason).toContain('frustration');
    });

    it('should escalate to reasoning model for complex story situations', async () => {
      const context = {
        currentBeat: { complexity: 0.9 },
        recentFailures: 3
      };

      const escalation = await orchestrator.checkEscalation(context, 'player-123');

      expect(escalation.shouldEscalate).toBe(true);
      expect(escalation.targetModel).toBe('gemini-exp-1206');
    });
  });

  describe('response generation', () => {
    it('should generate structured response for narrative tasks', async () => {
      vi.mocked(mockGeminiResponse).mockResolvedValue({
        narrativeResponse: 'You enter the dimly lit tavern...',
        stateUpdates: { location: 'tavern_interior' },
        newChoices: ['talk to bartender', 'examine room'],
        confidence: 0.9
      });

      const response = await orchestrator.processRequest(
        'narrative_generation',
        { playerInput: 'enter tavern' },
        'player-123'
      );

      expect(response.narrativeResponse).toBeTruthy();
      expect(response.stateUpdates).toHaveProperty('location');
      expect(response.newChoices).toHaveLength.greaterThan(0);
    });
  });
});
```

#### API Integration TDD Example
```typescript
// tests/integration/api-game-flow.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestServer } from '../../helpers/test-server';
import { FastifyInstance } from 'fastify';
import supertest from 'supertest';

describe('Game API Flow', () => {
  let server: FastifyInstance;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(async () => {
    server = await createTestServer();
    await server.ready();
    request = supertest(server.server);
  });

  afterEach(async () => {
    await server.close();
  });

  describe('complete game session', () => {
    it('should handle full game flow from start to save', async () => {
      // 1. Get available stories (no spoilers)
      const storiesResponse = await request
        .get('/api/stories')
        .expect(200);

      expect(storiesResponse.body.stories).toHaveLength.greaterThan(0);
      expect(storiesResponse.body.stories[0]).not.toHaveProperty('beats');

      // 2. Start new game
      const gameResponse = await request
        .post('/api/games')
        .send({
          storyId: storiesResponse.body.stories[0].id,
          playerId: 'test-player'
        })
        .expect(201);

      const gameId = gameResponse.body.gameId;
      expect(gameResponse.body.currentBeat.act).toBe(1);

      // 3. Send player action
      const actionResponse = await request
        .post(`/api/games/${gameId}/actions`)
        .send({ input: 'look around the room' })
        .expect(200);

      expect(actionResponse.body.response).toBeTruthy();
      expect(actionResponse.body.gameState).toBeDefined();

      // 4. Save game
      const saveResponse = await request
        .post(`/api/games/${gameId}/save`)
        .send({ saveName: 'Test Save' })
        .expect(200);

      expect(saveResponse.body.saveId).toBeTruthy();
    });

    it('should handle AI escalation during difficult situations', async () => {
      // Create game session
      const gameResponse = await request
        .post('/api/games')
        .send({ storyId: 'complex-story', playerId: 'test-player' })
        .expect(201);

      const gameId = gameResponse.body.gameId;

      // Send frustrating inputs to trigger escalation
      await request
        .post(`/api/games/${gameId}/actions`)
        .send({ input: 'i dont understand' })
        .expect(200);

      await request
        .post(`/api/games/${gameId}/actions`)
        .send({ input: 'this is confusing' })
        .expect(200);

      const escalationResponse = await request
        .post(`/api/games/${gameId}/actions`)
        .send({ input: 'help me' })
        .expect(200);

      // Should show escalation in response metadata
      expect(escalationResponse.body.metadata.escalated).toBe(true);
      expect(escalationResponse.body.metadata.model).toContain('claude');
    });
  });
});
```

---

## Story Management System

### Spoiler-Free Story Loading
```typescript
export class StoryService {
  private loadedStoryMetadata = new Map<string, StoryMetadata>();
  private activeStoryContent = new Map<string, StoryContent>();

  async loadAvailableStories(
    filters?: StoryFilters
  ): Promise<StoryMetadata[]> {
    const storyFiles = await this.getStoryFiles();
    const stories: StoryMetadata[] = [];

    for (const file of storyFiles) {
      const metadata = await this.extractMetadata(file);

      // Only expose safe metadata - no story content!
      if (this.matchesFilters(metadata, filters)) {
        stories.push({
          id: metadata.id,
          title: metadata.title,
          description: metadata.description,
          difficulty: metadata.difficulty,
          estimatedLength: metadata.estimatedLength,
          tags: metadata.tags,
          // Explicitly NOT including: beats, endings, characters
        });
      }
    }

    return stories;
  }

  async initializeStory(
    storyId: string,
    playerId: string
  ): Promise<GameSession> {
    // Load only the initial beat - no future content
    const storyContent = await this.loadStoryContent(storyId);
    const initialBeat = this.findInitialBeat(storyContent);

    // Create game session with limited visibility
    const session = new GameSession({
      id: nanoid(),
      storyId,
      playerId,
      currentBeat: this.sanitizeBeat(initialBeat),
      gameState: this.createInitialGameState(),
      createdAt: new Date()
    });

    // Store only current beat in memory
    this.activeStoryContent.set(session.id, {
      currentBeat: initialBeat,
      availableTransitions: initialBeat.exitTransitions
    });

    return session;
  }

  async getNextBeat(
    sessionId: string,
    completedObjectives: string[]
  ): Promise<StoryBeat | null> {
    const activeContent = this.activeStoryContent.get(sessionId);
    if (!activeContent) {
      throw new Error('Session not found');
    }

    // Dynamically load next beat based on current state
    const availableTransitions = activeContent.availableTransitions
      .filter(transition =>
        this.meetsRequirements(transition.requirements, completedObjectives)
      );

    if (availableTransitions.length === 0) {
      return null; // Story end or stuck
    }

    // Load next beat content just-in-time
    const nextBeatId = this.selectBestTransition(availableTransitions);
    const nextBeat = await this.loadSpecificBeat(
      activeContent.storyId,
      nextBeatId
    );

    // Update active content to new beat
    this.activeStoryContent.set(sessionId, {
      currentBeat: nextBeat,
      availableTransitions: nextBeat.exitTransitions
    });

    return this.sanitizeBeat(nextBeat);
  }

  private sanitizeBeat(beat: StoryBeat): StoryBeat {
    // Remove spoiler information from beat
    return {
      id: beat.id,
      act: beat.act,
      title: beat.title,
      description: beat.description,
      objectives: beat.objectives,
      setting: beat.setting,
      // Remove: future_hints, ending_implications, meta_information
    };
  }
}
```

### JSON Story Format
```typescript
// Story file structure: stories/fantasy-quest.json
interface StoryFile {
  metadata: StoryMetadata;
  beats: StoryBeat[];
  characters: Character[];
  items: Item[];
  endings: Ending[];
}

interface StoryMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  version: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedLength: number; // minutes
  tags: string[];
  contentWarnings?: string[];
}

interface StoryBeat {
  id: string;
  act: 1 | 2 | 3;
  title: string;
  description: string;
  setting: {
    location: string;
    timeOfDay: string;
    atmosphere: string;
  };
  objectives: Objective[];
  exitTransitions: Transition[];
  aiGuidance: {
    tone: string;
    style: string;
    keyThemes: string[];
    avoidTopics: string[];
  };
  // Internal story structure (hidden from players)
  endingImplications: {
    [endingId: string]: number;
  };
  characterArcs: {
    [characterId: string]: CharacterState;
  };
}

interface Objective {
  id: string;
  description: string;
  type: 'required' | 'optional' | 'hidden';
  completionHints: string[];
  weight: number; // For ending calculations
}

interface Transition {
  targetBeatId: string;
  requirements: Requirement[];
  weight: number; // For automatic selection
  description?: string; // Internal use only
}

interface Requirement {
  type: 'objective' | 'choice' | 'state' | 'random';
  condition: string;
  value?: any;
}
```

### Example Story File
```json
{
  "metadata": {
    "id": "merchant-mystery",
    "title": "The Missing Merchant",
    "description": "A mysterious disappearance in a peaceful village leads to dark secrets.",
    "author": "Game Dev Team",
    "version": "1.0.0",
    "difficulty": "beginner",
    "estimatedLength": 120,
    "tags": ["mystery", "fantasy", "investigation"],
    "contentWarnings": ["mild violence", "supernatural themes"]
  },
  "beats": [
    {
      "id": "village_arrival",
      "act": 1,
      "title": "Arrival at Millhaven",
      "description": "You arrive at the small village of Millhaven as storm clouds gather overhead.",
      "setting": {
        "location": "village_entrance",
        "timeOfDay": "evening",
        "atmosphere": "tense, foreboding"
      },
      "objectives": [
        {
          "id": "enter_village",
          "description": "Enter the village",
          "type": "required",
          "completionHints": ["approach the village", "walk into town"],
          "weight": 1
        },
        {
          "id": "talk_to_villager",
          "description": "Learn about the situation",
          "type": "required",
          "completionHints": ["speak with someone", "ask questions"],
          "weight": 2
        }
      ],
      "exitTransitions": [
        {
          "targetBeatId": "tavern_investigation",
          "requirements": [
            { "type": "objective", "condition": "enter_village" },
            { "type": "objective", "condition": "talk_to_villager" }
          ],
          "weight": 3,
          "description": "Standard story progression"
        },
        {
          "targetBeatId": "aggressive_approach",
          "requirements": [
            { "type": "choice", "condition": "intimidate_villager" }
          ],
          "weight": 1,
          "description": "Aggressive investigation path"
        }
      ],
      "aiGuidance": {
        "tone": "mysterious, slightly ominous",
        "style": "descriptive but not overwhelming",
        "keyThemes": ["mystery", "small town secrets", "approaching danger"],
        "avoidTopics": ["graphic violence", "explicit content"]
      },
      "endingImplications": {
        "hero_ending": 0,
        "detective_ending": 1,
        "rogue_ending": 0
      },
      "characterArcs": {
        "village_elder": "initial_suspicion",
        "tavern_keeper": "cautious_friendliness"
      }
    }
  ],
  "characters": [
    {
      "id": "village_elder",
      "name": "Elder Thomsen",
      "description": "A weathered man with knowing eyes",
      "personality": ["wise", "secretive", "protective"],
      "knowledge": ["village_history", "merchant_routes", "old_legends"],
      "relationships": {
        "player": "neutral",
        "tavern_keeper": "trusted_friend"
      }
    }
  ],
  "items": [
    {
      "id": "merchants_ledger",
      "name": "Garrett's Ledger",
      "description": "A leather-bound book with recent transactions",
      "properties": ["readable", "evidence", "valuable"],
      "revealsBeatIds": ["darkwood_clues"]
    }
  ],
  "endings": [
    {
      "id": "hero_ending",
      "title": "The Village Hero",
      "description": "You save the village and become a local legend",
      "requirements": [
        { "type": "state", "condition": "village_reputation", "value": ">= 80" },
        { "type": "objective", "condition": "save_merchant" }
      ],
      "unlockText": "Your heroic actions have saved Millhaven..."
    }
  ]
}
```

---

## Core API Specification

### RESTful API Design
```typescript
// API Route Structure
interface APIRoutes {
  // Story Discovery
  'GET /api/stories': {
    query?: StoryFilters;
    response: { stories: StoryMetadata[] };
  };

  'GET /api/stories/:id/metadata': {
    params: { id: string };
    response: StoryMetadata;
  };

  // Game Management
  'POST /api/games': {
    body: { storyId: string; playerId: string };
    response: { gameId: string; currentBeat: StoryBeat };
  };

  'GET /api/games/:id': {
    params: { id: string };
    response: GameSession;
  };

  'POST /api/games/:id/actions': {
    params: { id: string };
    body: { input: string; metadata?: ActionMetadata };
    response: ActionResponse;
  };

  'POST /api/games/:id/save': {
    params: { id: string };
    body: { saveName: string };
    response: { saveId: string };
  };

  'GET /api/games/:id/context': {
    params: { id: string };
    query?: { limit?: number };
    response: { context: PlayerInteraction[] };
  };

  // Player Management
  'POST /api/players': {
    body: { username: string; preferences?: PlayerPreferences };
    response: { playerId: string };
  };

  'GET /api/players/:id/saves': {
    params: { id: string };
    response: { saves: GameSave[] };
  };

  'POST /api/players/:id/saves/:saveId/load': {
    params: { id: string; saveId: string };
    response: { gameId: string; gameSession: GameSession };
  };
}
```

### WebSocket Real-time API
```typescript
interface WebSocketEvents {
  // Client to Server
  'game:join': { gameId: string; playerId: string };
  'game:action': { input: string; metadata?: ActionMetadata };
  'game:typing': { isTyping: boolean };

  // Server to Client
  'game:response': ActionResponse;
  'game:state_update': { gameState: GameState };
  'game:escalation': { reason: string; newModel: string };
  'game:error': { error: string; code: number };
  'ai:thinking': { status: 'started' | 'completed' };
}
```

### Core API Implementation
```typescript
import Fastify from 'fastify';
import { Type } from '@sinclair/typebox';

const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Register plugins
await server.register(import('@fastify/swagger'), {
  openapi: {
    info: { title: 'Adventure Game API', version: '1.0.0' }
  }
});

await server.register(import('@fastify/websocket'));

// Game Routes
server.post('/api/games', {
  schema: {
    body: Type.Object({
      storyId: Type.String(),
      playerId: Type.String()
    }),
    response: {
      201: Type.Object({
        gameId: Type.String(),
        currentBeat: Type.Object({
          id: Type.String(),
          title: Type.String(),
          description: Type.String()
        })
      })
    }
  }
}, async (request, reply) => {
  const { storyId, playerId } = request.body;

  try {
    const gameSession = await gameService.createGame(storyId, playerId);

    reply.code(201).send({
      gameId: gameSession.id,
      currentBeat: gameSession.currentBeat
    });
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

server.post('/api/games/:gameId/actions', {
  schema: {
    params: Type.Object({
      gameId: Type.String()
    }),
    body: Type.Object({
      input: Type.String({ minLength: 1, maxLength: 500 }),
      metadata: Type.Optional(Type.Object({
        timestamp: Type.Number(),
        clientType: Type.String()
      }))
    })
  }
}, async (request, reply) => {
  const { gameId } = request.params;
  const { input, metadata } = request.body;

  try {
    // Get current game session
    const session = await gameService.getSession(gameId);
    if (!session) {
      return reply.code(404).send({ error: 'Game session not found' });
    }

    // Process player action through AI orchestrator
    const response = await aiOrchestrator.processPlayerAction(
      input,
      session,
      metadata
    );

    // Update game state
    const updatedSession = await gameService.updateSession(
      gameId,
      response.stateUpdates
    );

    // Store interaction for context
    await database.storeInteraction(session.playerId, {
      input,
      response: response.narrativeResponse,
      timestamp: Date.now(),
      gameId,
      beatId: session.currentBeat.id
    });

    reply.send({
      response: response.narrativeResponse,
      gameState: updatedSession.gameState,
      choices: response.newChoices,
      metadata: {
        model: response.modelUsed,
        escalated: response.escalated,
        confidence: response.confidence
      }
    });
  } catch (error) {
    reply.code(500).send({ error: error.message });
  }
});

// WebSocket Game Connection
server.register(async function (fastify) {
  fastify.get('/ws/games/:gameId', { websocket: true }, async (connection, request) => {
    const { gameId } = request.params;

    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'game:action':
            const response = await processGameAction(gameId, data.payload);
            connection.socket.send(JSON.stringify({
              type: 'game:response',
              payload: response
            }));
            break;

          case 'game:join':
            const session = await gameService.getSession(gameId);
            connection.socket.send(JSON.stringify({
              type: 'game:state',
              payload: session
            }));
            break;
        }
      } catch (error) {
        connection.socket.send(JSON.stringify({
          type: 'error',
          payload: { message: error.message }
        }));
      }
    });
  });
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🎮 Adventure Game API started on http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
```

---

## TUI Interface Implementation

### Terminal Client Architecture
```typescript
// Terminal client as API consumer
export class TerminalClient {
  private apiClient: GameAPIClient;
  private wsConnection: WebSocket;
  private gameState: ClientGameState | null = null;

  constructor(private config: ClientConfig) {
    this.apiClient = new GameAPIClient(config.apiUrl);
    this.setupWebSocket();
  }

  async startGame(storyId: string, playerId: string): Promise<void> {
    try {
      const response = await this.apiClient.createGame(storyId, playerId);
      this.gameState = {
        gameId: response.gameId,
        currentBeat: response.currentBeat,
        isConnected: true
      };

      // Connect to WebSocket for real-time updates
      await this.connectWebSocket(response.gameId);

    } catch (error) {
      throw new Error(`Failed to start game: ${error.message}`);
    }
  }

  async sendAction(input: string): Promise<ActionResponse> {
    if (!this.gameState) {
      throw new Error('No active game session');
    }

    // Send via WebSocket for real-time experience
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Action timeout'));
      }, 30000);

      this.wsConnection.send(JSON.stringify({
        type: 'game:action',
        payload: {
          input,
          metadata: {
            timestamp: Date.now(),
            clientType: 'terminal'
          }
        }
      }));

      this.wsConnection.once('message', (data) => {
        clearTimeout(timeout);
        const response = JSON.parse(data.toString());

        if (response.type === 'game:response') {
          resolve(response.payload);
        } else if (response.type === 'error') {
          reject(new Error(response.payload.message));
        }
      });
    });
  }

  private setupWebSocket(): void {
    this.wsConnection = new WebSocket(`${this.config.wsUrl}/ws/games`);

    this.wsConnection.on('message', (data) => {
      const message = JSON.parse(data.toString());
      this.handleWebSocketMessage(message);
    });
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'ai:thinking':
        this.onAIThinking?.(message.payload.status === 'started');
        break;

      case 'game:escalation':
        this.onEscalation?.(message.payload.reason, message.payload.newModel);
        break;

      case 'game:state_update':
        this.gameState = { ...this.gameState, ...message.payload };
        this.onStateUpdate?.(this.gameState);
        break;
    }
  }

  // Event handlers for UI updates
  onAIThinking?: (isThinking: boolean) => void;
  onEscalation?: (reason: string, model: string) => void;
  onStateUpdate?: (state: ClientGameState) => void;
}
```

### Enhanced TUI Components
```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, Spacer } from 'ink';
import { TerminalClient } from '../client/TerminalClient';

export const GameScreen: React.FC<{ client: TerminalClient }> = ({ client }) => {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [escalationNotice, setEscalationNotice] = useState<string | null>(null);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);

  useEffect(() => {
    // Set up client event handlers
    client.onAIThinking = setAiThinking;
    client.onEscalation = (reason, model) => {
      setEscalationNotice(`🧠 Switching to ${model} (${reason})`);
      setTimeout(() => setEscalationNotice(null), 5000);
    };
    client.onStateUpdate = setGameState;
  }, [client]);

  useInput((input, key) => {
    if (isProcessing || aiThinking) return;

    if (key.return && input.trim()) {
      handlePlayerInput(input.trim());
      setInput('');
    } else if (key.backspace) {
      setInput(prev => prev.slice(0, -1));
    } else if (input && !key.ctrl) {
      setInput(prev => prev + input);
    }
  });

  const handlePlayerInput = async (playerInput: string) => {
    setIsProcessing(true);
    setMessageHistory(prev => [...prev, {
      type: 'player',
      content: playerInput,
      timestamp: Date.now()
    }]);

    try {
      const response = await client.sendAction(playerInput);

      setMessageHistory(prev => [...prev, {
        type: 'game',
        content: response.response,
        choices: response.choices,
        metadata: response.metadata,
        timestamp: Date.now()
      }]);

    } catch (error) {
      setMessageHistory(prev => [...prev, {
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!gameState) {
    return (
      <Box flexDirection="column" padding={2}>
        <Text>🎮 Connecting to game...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Header with game info */}
      <Box borderStyle="double" paddingX={2} paddingY={1}>
        <Text bold color="cyan">
          {gameState.currentBeat.title} - Act {gameState.currentBeat.act}
        </Text>
        <Spacer />
        {aiThinking && (
          <Text color="yellow">🧠 AI thinking...</Text>
        )}
        {escalationNotice && (
          <Text color="magenta">{escalationNotice}</Text>
        )}
      </Box>

      {/* Message history */}
      <Box flexGrow={1} flexDirection="column" paddingX={2} paddingY={1}>
        {messageHistory.map((message, index) => (
          <MessageComponent key={index} message={message} />
        ))}
      </Box>

      {/* Status bar */}
      <Box borderStyle="single" paddingX={2}>
        <Text>
          Health: {gameState.playerState?.health || 100}/100
        </Text>
        <Spacer />
        <Text>
          Location: {gameState.playerState?.location || 'Unknown'}
        </Text>
        <Spacer />
        <Text color="gray">
          {isProcessing ? 'Processing...' : 'Ready'}
        </Text>
      </Box>

      {/* Input area */}
      <Box paddingX={2} paddingY={1}>
        <Text color="green" bold>
          &gt; {input}
          {!isProcessing && !aiThinking && <Text backgroundColor="green"> </Text>}
        </Text>
      </Box>
    </Box>
  );
};

const MessageComponent: React.FC<{ message: Message }> = ({ message }) => {
  switch (message.type) {
    case 'player':
      return (
        <Box marginBottom={1}>
          <Text color="blue" bold>&gt; {message.content}</Text>
        </Box>
      );

    case 'game':
      return (
        <Box flexDirection="column" marginBottom={1}>
          <Text wrap="wrap">{message.content}</Text>
          {message.choices && message.choices.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">Available actions:</Text>
              {message.choices.map((choice, index) => (
                <Text key={index} color="cyan">  • {choice}</Text>
              ))}
            </Box>
          )}
          {message.metadata?.escalated && (
            <Text color="magenta" italic>
              (Enhanced AI response)
            </Text>
          )}
        </Box>
      );

    case 'error':
      return (
        <Box marginBottom={1}>
          <Text color="red">❌ {message.content}</Text>
        </Box>
      );

    default:
      return null;
  }
};
```

---

## Development Roadmap

### 8-Week TDD Development Plan

#### Phase 1: Core Infrastructure (Weeks 1-2)

**Week 1: Test Foundation & API Structure**
```bash
# Day 1-2: Project setup with comprehensive testing
- Initialize TypeScript project with Vitest
- Set up API test framework with Fastify
- Create mock implementations for all external services
- Write initial failing tests for core interfaces

# Day 3-4: Database layer TDD
- Write tests for hybrid database operations
- Implement LMDB + SQLite integration
- Add Turso cloud sync functionality
- Test data persistence and retrieval

# Day 5-7: AI orchestration tests
- Mock AI providers (Gemini, Claude)
- Test model selection logic
- Implement frustration detection tests
- Add escalation trigger tests
```

**Week 2: Game Service Foundation**
```bash
# Day 1-3: Story service TDD
- Test story loading without spoilers
- Implement beat progression logic
- Add story validation tests
- Test multiple story support

# Day 4-5: Player service tests
- Player state management tests
- Save/load functionality tests
- Context tracking tests

# Day 6-7: Basic API endpoints
- RESTful API test suite
- WebSocket connection tests
- Error handling tests
```

#### Phase 2: AI Integration & Game Logic (Weeks 3-4)

**Week 3: Multi-Model AI System**
```bash
# Day 1-2: Model orchestration
- Implement Gemini 2.0 Flash integration
- Add reasoning model selection
- Test function calling for intent detection

# Day 3-4: Escalation system
- Frustration detection implementation
- Model escalation logic
- Performance monitoring

# Day 5-7: Response generation
- Structured prompt system
- Response validation
- Context management
```

**Week 4: Game Flow Implementation**
```bash
# Day 1-3: Story progression
- Beat transition logic
- Objective tracking
- Multiple ending paths

# Day 4-5: Player interaction
- Natural language processing
- Action validation
- State updates

# Day 6-7: Integration testing
- End-to-end game flow tests
- Multi-session handling
- Performance optimization
```

#### Phase 3: Interface Development (Weeks 5-6)

**Week 5: API Completion**
```bash
# Day 1-3: Complete API implementation
- All CRUD operations
- WebSocket real-time features
- Comprehensive error handling

# Day 4-5: Documentation
- OpenAPI specification
- API documentation
- Usage examples

# Day 6-7: Performance optimization
- Response caching
- Database optimization
- Load testing
```

**Week 6: TUI Client**
```bash
# Day 1-3: Terminal interface
- Ink-based UI components
- API client implementation
- Real-time updates

# Day 4-5: User experience
- Input handling
- Visual feedback
- Error states

# Day 6-7: Polish and testing
- UI component tests
- User interaction tests
- Accessibility improvements
```

#### Phase 4: Testing & Deployment (Weeks 7-8)

**Week 7: Comprehensive Testing**
```bash
# Day 1-2: Test coverage analysis
- Achieve 90%+ code coverage
- Integration test completion
- Performance benchmarking

# Day 3-4: User acceptance testing
- Story playthrough testing
- AI response quality validation
- Error scenario testing

# Day 5-7: Optimization
- Response time optimization
- Memory usage optimization
- Cost optimization
```

**Week 8: Deployment & Documentation**
```bash
# Day 1-2: Deployment preparation
- Docker containerization
- Environment configuration
- CI/CD pipeline setup

# Day 3-4: Documentation completion
- Developer documentation
- API reference
- User guides

# Day 5-7: Launch preparation
- Final testing
- Performance monitoring setup
- Launch readiness review
```

### Success Metrics & KPIs

#### Technical Metrics
- **Test Coverage**: 90%+ across all components
- **API Response Time**: <2 seconds average, <5 seconds 95th percentile
- **AI Response Quality**: <5% regeneration rate
- **System Uptime**: 99.5% availability
- **Cost Efficiency**: <$0.15 per complete playthrough

#### User Experience Metrics
- **Completion Rate**: 70%+ of sessions reach story conclusion
- **Engagement Time**: 45+ minutes average session length
- **User Satisfaction**: 85%+ positive feedback
- **Story Coherence**: 90%+ of players report consistent narrative
- **Technical Issues**: <2% of sessions encounter errors

#### Business Metrics
- **Development Velocity**: All milestones met within 8-week timeline
- **Code Quality**: <1 critical bug per 1000 lines of code
- **Documentation Quality**: 95%+ API endpoint documentation coverage
- **Extensibility**: Clean interfaces for future web/voice clients

This comprehensive specification provides a complete roadmap for building a sophisticated, API-first adventure game engine with intelligent AI orchestration, spoiler-free story management, and a beautiful terminal interface, all developed using test-driven methodology for maximum reliability and extensibility.