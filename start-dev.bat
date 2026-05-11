@echo off
echo 🏥 Starting Clinical Decision Support Tool...
echo.

REM Check if .env files exist
if not exist "backend\.env" (
    echo ⚠️  Backend .env not found. Creating from template...
    copy backend\.env.example backend\.env
    echo ✅ Created backend\.env - Please edit and set JWT_SECRET
)

if not exist "frontend\.env" (
    echo ⚠️  Frontend .env not found. Creating from template...
    copy frontend\.env.example frontend\.env
    echo ✅ Created frontend\.env
)

echo.
echo 📦 Installing dependencies...
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo 🚀 Starting services...
echo.

REM Start backend in new window
echo Starting backend on http://localhost:3001...
start "Clinical Support Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
echo Starting frontend on http://localhost:5173...
start "Clinical Support Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Services started in separate windows!
echo.
echo 📍 Frontend: http://localhost:5173
echo 📍 Backend:  http://localhost:3001
echo 📍 Health:   http://localhost:3001/health
echo.
echo Close the terminal windows to stop the services
echo.
pause


