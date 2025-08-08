#!/bin/bash

echo "🏠 Rental System - Quick Start"
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "🔧 Setting up environment variables..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your MongoDB connection string"
    echo "   - For local MongoDB: mongodb://localhost:27017/rental-system"
    echo "   - For MongoDB Atlas: your_atlas_connection_string"
fi

echo ""
echo "🚀 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your MongoDB connection string"
echo "2. Start MongoDB (local or Atlas)"
echo "3. Run: npm run dev"
echo ""
echo "📖 For detailed instructions, see README.md"


