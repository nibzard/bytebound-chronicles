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

🚧 **In Development** - This project is currently in the specification and design phase.

See [`terminal_adventure_mvp_spec.md`](./terminal_adventure_mvp_spec.md) for the complete technical specification.

## Getting Started

*(Implementation in progress)*

```bash
# Setup
npm install
npm run setup-db

# Development
npm run dev:all

# Testing
npm test
```

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) - Development guidance and architecture overview
- [`terminal_adventure_mvp_spec.md`](./terminal_adventure_mvp_spec.md) - Complete technical specification

## License

MIT