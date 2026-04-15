#!/bin/bash

# Test script for TUI - runs basic checks without interactive mode
set -e

echo "🧪 Testing Bytebound Chronicles TUI Stack..."
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
if npm run typecheck > /dev/null 2>&1; then
    echo "✅ TypeScript compilation passed"
else
    echo "❌ TypeScript compilation failed"
    echo "Run 'npm run typecheck' to see errors"
fi

# Check if API server can start
echo "🚀 Testing API server startup..."
timeout 10s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test API health endpoint
API_PORT="${API_PORT:-3000}"
if curl -s "http://localhost:${API_PORT}/health" > /dev/null; then
    echo "✅ API server is responsive on port ${API_PORT}"
else
    echo "❌ API server is not responding on port ${API_PORT}"
fi

# Clean up server
kill $SERVER_PID 2>/dev/null || true
sleep 1

# Test client compilation
echo "🎯 Testing TUI client compilation..."
if tsx --check src/client/index.tsx > /dev/null 2>&1; then
    echo "✅ TUI client compiles successfully"
else
    echo "❌ TUI client compilation failed"
fi

echo ""
echo "🎮 To run the full TUI:"
echo "   ./scripts/run-tui.sh"
echo ""
echo "📖 Make sure to set your API keys:"
echo "   export GOOGLE_AI_API_KEY=your_key_here"
echo "   export ANTHROPIC_API_KEY=your_key_here  # optional"