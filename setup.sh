#!/bin/bash

echo "🏏 Cricket Analytics Setup Script"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Please ensure PostgreSQL is installed and running."
else
    echo "✅ PostgreSQL is installed"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📝 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Please edit .env and add your database credentials and API keys"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "🔧 Next steps:"
echo "1. Edit .env file with your PostgreSQL credentials and API keys"
echo "2. Create a PostgreSQL database: CREATE DATABASE cricket_analytics;"
echo "3. Run: npm run db:generate"
echo "4. Run: npm run db:push"
echo "5. Run: npm run dev"
echo ""
echo "📖 For detailed instructions, see README.md"
echo ""
echo "✅ Setup complete!"
