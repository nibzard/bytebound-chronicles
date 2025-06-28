# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Project Overview

Bytebound Chronicles is a Terminal LLM Adventure Game engine with intelligent AI orchestration. It features an API-first architecture separating game logic from the terminal interface, enabling future extensibility to web, mobile, or voice clients.

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
Each story is a self-contained JSON file in the `/stories/` directory:
```
stories/
├── metadata.json           # Story catalog listing all available stories
├── tutorial-quest.json     # Complete story file with all content
├── merchant-mystery.json   # Another complete story file
└── darkwood-saga.json      # Each story is a single JSON file
```

### Adding New Stories
1. Create a single JSON file in `/stories/` with complete story content
2. Update the main metadata.json catalog with story reference
3. Run `npm run validate:stories` to verify format
4. Story file includes metadata, beats, characters, items, and endings all in one file

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

## Error Handling

- API errors use structured error responses with appropriate HTTP codes
- AI failures trigger automatic model fallback
- Database errors include retry logic for transient failures
- WebSocket disconnections trigger automatic reconnection
- User frustration triggers empathetic AI model escalation

## Development Best Practices

### Code Quality Standards
- **TypeScript First**: Define comprehensive types before implementation
- **Type Safety**: Use strict TypeScript settings with no implicit any
- **Validation**: Implement Zod schemas for runtime type checking
- **Testing**: Maintain 90%+ test coverage with meaningful test cases
- **Linting**: Follow ESLint rules with automatic fixing where possible
- **Formatting**: Use Prettier for consistent code formatting

### Architecture Principles
- **Separation of Concerns**: Clear boundaries between layers (types, database, services, API)
- **Hybrid Database Strategy**: Use LMDB for high-frequency operations, SQLite for structured data
- **Progressive Loading**: Implement spoiler-free content delivery
- **Error Resilience**: Graceful degradation and comprehensive error handling
- **Performance Optimization**: Consider cost, latency, and scalability in design decisions
