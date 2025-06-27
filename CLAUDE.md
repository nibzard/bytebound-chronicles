# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bytebound Chronicles is a Terminal LLM Adventure Game with intelligent AI orchestration. It features an API-first architecture separating game logic from the terminal interface, enabling future extensibility to web, mobile, or voice clients.

## Technology Stack

**Backend/API:**
- Node.js 20+ with ESM modules
- Fastify 4.x for high-performance API
- TypeScript 5.0+
- Zod + Fastify schemas for validation
- Vitest + Supertest for testing

**Database Architecture:**
- LMDB: High-frequency gameplay data and real-time interactions
- SQLite: Structured data (players, saves, analytics) with WAL mode
- Turso: Optional cloud synchronization

**Terminal Client:**
- React Ink for terminal UI
- WebSocket for real-time communication
- Chalk for terminal styling

**AI Integration:**
- Google Gemini (multiple models for different tasks)
- Anthropic Claude (escalation scenarios)
- Intelligent model selection based on task complexity and user frustration

## Key Architectural Patterns

### Multi-Model AI Orchestration
The system uses different AI models for different tasks:
- `gemini-2.0-thinking-exp`: Complex story reasoning
- `gemini-2.0-flash-exp`: Intent detection with function calling
- `claude-3-5-sonnet-20241022`: User frustration handling (empathy)
- `gemini-exp-1206`: High-complexity escalation scenarios

### Hybrid Database Strategy
- **LMDB**: Player interactions, AI responses, session context (high-frequency operations)
- **SQLite**: Game saves, player profiles, analytics (structured queries)
- **Turso**: Cloud sync for cross-device persistence

### Spoiler-Free Story Management
Stories are loaded progressively - only current beat content is accessible, preventing spoilers. Future story content is loaded just-in-time based on player progress.

## Development Commands

### Setup
```bash
npm install
npm run setup-db  # Initialize LMDB and SQLite databases
```

### Development
```bash
npm run dev        # Start API server with hot reload
npm run dev:client # Start terminal client in development mode
npm run dev:all    # Start both API and client concurrently
```

### Testing
```bash
npm test          # Run all tests
npm run test:unit # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e  # End-to-end tests
npm run test:watch # Watch mode for TDD
```

### Database Management
```bash
npm run db:migrate # Run database migrations
npm run db:seed    # Seed test data
npm run db:reset   # Reset all databases (development only)
```

### Build and Deployment
```bash
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # ESLint checking
npm run typecheck # TypeScript type checking
```

## Story Development

### Story File Structure
Stories are JSON files in `/stories/` directory with this structure:
```
stories/
├── metadata.json     # Story catalog
├── story-1/
│   ├── metadata.json # Story-specific metadata
│   ├── beats/        # Story beats (loaded just-in-time)
│   └── assets/       # Story assets
```

### Adding New Stories
1. Create story directory under `/stories/`
2. Add metadata.json with story information
3. Create beats as individual JSON files
4. Update main metadata.json catalog
5. Run `npm run validate:stories` to verify format

## Testing Strategy

### Test-Driven Development
The project follows TDD with comprehensive test coverage:
- **Unit Tests**: Individual components and services
- **Integration Tests**: API endpoints and database operations
- **End-to-End Tests**: Complete game flow from story start to save
- **AI Tests**: Mock AI responses for consistent testing

### Key Test Patterns
- Database tests use isolated test databases
- AI orchestrator tests use mocked model responses
- Story service tests verify spoiler-free content loading
- WebSocket tests verify real-time communication

## Code Organization

### Core Services
- `src/services/ai-orchestrator.ts`: Multi-model AI coordination
- `src/services/story-service.ts`: Story loading and progression
- `src/services/game-service.ts`: Game session management
- `src/services/database-service.ts`: Hybrid database operations

### API Layer
- `src/routes/`: Fastify route handlers with Zod validation
- `src/websocket/`: WebSocket event handlers
- `src/schemas/`: Zod schemas for request/response validation

### Terminal Client
- `src/client/`: React Ink terminal interface
- `src/client/components/`: Reusable UI components
- `src/client/hooks/`: Custom React hooks for game state

## Environment Configuration

Required environment variables:
```bash
GOOGLE_AI_API_KEY=     # Google Gemini API access
ANTHROPIC_API_KEY=     # Claude API access (for escalation)
TURSO_URL=            # Optional: Turso database URL
TURSO_AUTH_TOKEN=     # Optional: Turso authentication
NODE_ENV=             # development | production | test
```

## Performance Considerations

- LMDB handles high-frequency operations (player interactions)
- SQLite with WAL mode for structured queries
- AI model selection optimizes for cost and latency
- WebSocket connections for real-time responsiveness
- Story content lazy-loading prevents memory bloat

## Development Workflow

1. **Feature Development**: Start with failing tests (TDD approach)
2. **AI Integration**: Test with mocked responses before live API calls
3. **Database Changes**: Always include migrations and rollback scripts
4. **Story Content**: Validate JSON format and test spoiler-free loading
5. **Terminal UI**: Test across different terminal sizes and color schemes

## Error Handling

- API errors use structured error responses with appropriate HTTP codes
- AI failures trigger automatic model fallback
- Database errors include retry logic for transient failures
- WebSocket disconnections trigger automatic reconnection
- User frustration triggers empathetic AI model escalation