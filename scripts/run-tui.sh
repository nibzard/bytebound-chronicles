#!/bin/bash

# Bytebound Chronicles TUI Runner
# This script starts both the API server and terminal client
# API keys can be set in .env file OR as environment variables

set -e

echo "🎮 Starting Bytebound Chronicles Terminal Interface..."
echo ""

# Check if we're in a proper terminal
if [ ! -t 0 ]; then
    echo "❌ This script must be run in a proper terminal (Terminal.app, iTerm2, etc.)"
    echo "   It cannot be run through IDEs or non-interactive environments."
    exit 1
fi

# Check API keys - either in environment or .env file
check_api_keys() {
    if [ -z "$GOOGLE_AI_API_KEY" ] && [ ! -f .env ]; then
        echo "❌ API keys are required to run the game"
        echo ""
        echo "You can either:"
        echo "  1. Set environment variables:"
        echo "     export GOOGLE_AI_API_KEY=your_key_here"
        echo "     export ANTHROPIC_API_KEY=your_key_here  # optional"
        echo ""
        echo "  2. Create a .env file:"
        echo "     cp .env.example .env"
        echo "     # Edit .env with your API keys"
        echo ""
        return 1
    fi
    
    if [ ! -f .env ] && [ ! -z "$GOOGLE_AI_API_KEY" ]; then
        echo "✅ Using API keys from environment variables"
    elif [ -f .env ]; then
        echo "✅ Using configuration from .env file"
    fi
}

# Check for API keys
if ! check_api_keys; then
    # Try to create .env from template if it doesn't exist
    if [ ! -f .env ]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        echo "✅ Created .env file. Please add your AI API keys and run again."
        echo ""
        echo "Edit .env file with your API keys:"
        echo "  GOOGLE_AI_API_KEY=your_key_here"
        echo "  ANTHROPIC_API_KEY=your_key_here  # optional"
        exit 1
    fi
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Start the API server in background
echo "🚀 Starting API server..."
npm run dev &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Get the API port from environment or default to 8080
API_PORT="${API_PORT:-8080}"

# Check if server is running
if ! curl -s "http://localhost:${API_PORT}/health" > /dev/null; then
    echo "❌ Failed to start API server on port ${API_PORT}"
    echo "   Check if the port is already in use."
    exit 1
fi

echo "✅ API server running on http://localhost:${API_PORT}"
echo ""

# Start the terminal client
echo "🎲 Starting terminal client..."
echo "   Use arrow keys to navigate, Enter to select, ESC to exit"
echo ""

npm run dev:client

# Cleanup when client exits
cleanup