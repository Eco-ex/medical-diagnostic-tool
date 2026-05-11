#!/bin/bash

# Clinical Decision Support Tool - Development Startup Script

echo "🏥 Starting Clinical Decision Support Tool..."
echo ""

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env not found. Creating from template..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env - Please edit and set JWT_SECRET"
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚠️  Frontend .env not found. Creating from template..."
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "🚀 Starting services..."
echo ""

# Start backend in background
echo "Starting backend on http://localhost:3001..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend:  http://localhost:3001"
echo "📍 Health:   http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait


