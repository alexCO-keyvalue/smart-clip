#!/bin/bash

echo "🚀 Installing Smart Clip dependencies..."

# Install backend dependencies
echo "📦 Installing Python backend dependencies..."
cd backend
if command -v python3 &> /dev/null; then
    python3 -m pip install -r requirements.txt
elif command -v python &> /dev/null; then
    python -m pip install -r requirements.txt
else
    echo "❌ Python not found. Please install Python 3.7+ first."
    exit 1
fi

# Install frontend dependencies  
echo "📦 Installing Node.js frontend dependencies..."
cd ../frontend
if command -v npm &> /dev/null; then
    npm install
elif command -v yarn &> /dev/null; then
    yarn install
else
    echo "❌ npm/yarn not found. Please install Node.js first."
    exit 1
fi

cd ..
echo "✅ Installation complete!"
echo ""
echo "To run the application:"
echo "  ./scripts/dev.sh    - Start both backend and frontend in development mode"
echo ""
