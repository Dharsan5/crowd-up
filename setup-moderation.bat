@echo off
:: CrowdUp Moderation System Setup Script (Windows)
:: This script sets up the backend moderation API

echo 🛡️  Setting up CrowdUp Moderation System...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

:: Navigate to server directory
cd server

:: Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

:: Create .env file from example if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Please edit server\.env and add your OpenAI API key:
    echo    OPENAI_API_KEY=your_actual_api_key_here
    echo.
) else (
    echo ✅ .env file already exists
)

:: Build TypeScript
echo 🔨 Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit server\.env and add your OpenAI API key
echo 2. Run: cd server ^&^& npm run dev
echo 3. The API will be available at http://localhost:3001
echo.
echo Frontend setup:
echo 1. Copy .env.example to .env in the main directory
echo 2. Run: npm run dev
echo 3. Visit the moderation demo at http://localhost:5173/moderation-demo
echo.
echo 🚀 Ready to start! Run 'npm run dev' in the server directory to start the API.
pause
