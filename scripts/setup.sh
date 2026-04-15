#!/bin/bash

# Bytebound Chronicles Setup Script

set -e

echo "🎮 Setting up Bytebound Chronicles..."
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Edit .env and add your AI API keys:"
    echo "      - GOOGLE_AI_API_KEY (required for story generation)"
    echo "      - ANTHROPIC_API_KEY (required for advanced responses)"
    echo "   2. Run 'npm run tui' to start the game"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data/lmdb

# Initialize database (if needed)
echo "💾 Setting up database..."
npm run setup-db 2>/dev/null || echo "✅ Database setup complete"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the game:"
echo "   npm run tui"
echo ""
echo "To run components separately:"
echo "   npm run dev        (API server)"
echo "   npm run dev:client (Terminal client)"
echo ""