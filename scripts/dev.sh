#!/bin/bash

echo "🚀 Starting Smart Clip in development mode..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Start backend server
echo "📡 Starting FastAPI backend server..."
cd backend
if command -v python3 &> /dev/null; then
    python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
elif command -v python &> /dev/null; then
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
else
    echo "❌ Python not found. Please install Python 3.7+ first."
    exit 1
fi

BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) - http://127.0.0.1:8000"

# Wait a moment for backend to start
sleep 2

# Start frontend Electron app
echo "🖥️  Starting Electron frontend..."
cd ../frontend
npm run dev --no-sandbox &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "🎉 Smart Clip is running!"
echo "   - Backend API: http://127.0.0.1:8000"
echo "   - Press Ctrl+Shift+V to open clipboard history"
echo "   - Press Ctrl+C to stop both services"
echo ""

# Wait for processes
wait
