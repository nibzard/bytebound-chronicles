![Bytebound Chronicles](./assets/bytebound_chronicles_small.png)

# Bytebound Chronicles

A Terminal LLM Adventure Game with intelligent AI orchestration.

## Overview

Bytebound Chronicles is an interactive terminal-based adventure game that uses multiple AI models to create dynamic, engaging narratives. The game features intelligent AI model selection, spoiler-free story management, and real-time gameplay through WebSocket connections.

## Key Features

- **Multi-Model AI Orchestration**: Automatically selects the best AI model for each task
- **Spoiler-Free Story Loading**: Progressive story revelation without spoilers
- **Real-Time Gameplay**: WebSocket-based communication for live updates
- **Hybrid Database System**: LMDB + SQLite + Turso for optimal performance
- **Terminal UI**: Rich terminal experience built with React Ink

## Architecture

- **API-First Design**: Separation of game logic from interface
- **Intelligent AI Selection**: Different models for different tasks (reasoning, empathy, function calling)
- **Progressive Story Loading**: Just-in-time content loading based on player progress
- **Cross-Device Sync**: Optional cloud synchronization with Turso

## Technology Stack

- **Backend**: Node.js, TypeScript, Fastify
- **Database**: LMDB, SQLite, Turso
- **Frontend**: React Ink, WebSocket
- **AI**: Google Gemini, Anthropic Claude
- **Testing**: Vitest, Supertest

## Development Status

🚧 **Phase 1 Complete: Foundation & Database Layer** 

✅ **Completed Features:**
- TypeScript project structure with comprehensive type system
- Hybrid database architecture (LMDB + SQLite) 
- Core game types and Zod validation schemas
- Player profile and game save management
- Real-time session tracking and analytics
- Comprehensive unit test suite

🔄 **Current Phase: AI Orchestration System**
- Multi-model AI integration (Gemini, Claude)
- Intelligent model selection and escalation
- Frustration detection and response optimization

See [`TODO.md`](./TODO.md) for detailed development roadmap and [`terminal_adventure_mvp_spec.md`](./terminal_adventure_mvp_spec.md) for the complete technical specification.

## Getting Started

**Prerequisites:**
- Node.js 20+
- npm or pnpm

**Setup:**

```bash
# Clone and setup
git clone https://github.com/nibzard/bytebound-chronicles.git
cd bytebound-chronicles
npm install

# Initialize databases
npm run setup-db

# Development
npm run dev:all    # Start both API and client
npm run dev        # API server only
npm run dev:client # Terminal client only

# Testing
npm test           # All tests
npm run test:unit  # Unit tests only
npm run typecheck  # TypeScript validation
npm run lint       # Code quality check
```

**Current Implementation Status:**
- ✅ Database layer with hybrid LMDB/SQLite architecture
- ✅ Core type system and validation schemas  
- ✅ Player management and game save system
- 🚧 AI orchestration system (in progress)
- ⏳ Story management system
- ⏳ API endpoints and WebSocket integration
- ⏳ Terminal client interface

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) - Development guidance and architecture overview
- [`terminal_adventure_mvp_spec.md`](./terminal_adventure_mvp_spec.md) - Complete technical specification

## License

This project is comprised of two main parts, each with its own license:

- **Source Code**: The source code of the game engine and associated tools is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file in the root directory for more details.

- **Story Content**: The story content, including all narratives, characters, and other creative works located in the `stories/` directory, is proprietary and protected by copyright. See the [LICENSE](./stories/LICENSE) file in the `stories/` directory for more details.
