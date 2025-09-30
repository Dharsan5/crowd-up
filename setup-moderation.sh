#!/bin/bash

# CrowdUp Moderation System Setup Script
# This script sets up the backend moderation API

set -e

echo "🛡️  Setting up CrowdUp Moderation System..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $NODE_VERSION found"

# Navigate to server directory
cd server

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit server/.env and add your OpenAI API key:"
    echo "   OPENAI_API_KEY=your_actual_api_key_here"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env and add your OpenAI API key"
echo "2. Run: cd server && npm run dev"
echo "3. The API will be available at http://localhost:3001"
echo ""
echo "Frontend setup:"
echo "1. Copy .env.example to .env in the main directory"
echo "2. Run: npm run dev"
echo "3. Visit the moderation demo at http://localhost:5173/moderation-demo"
echo ""

# Test basic functionality
echo "🧪 Testing basic setup..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - please check for errors above"
    exit 1
fi

echo ""
echo "🚀 Ready to start! Run 'npm run dev' in the server directory to start the API."
