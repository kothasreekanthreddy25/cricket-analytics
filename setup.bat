@echo off
echo 🏏 Cricket Analytics Quick Start
echo ==================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed

echo.
echo Installing dependencies...
call npm install

echo.
echo Setting up environment file...
if not exist .env (
    copy .env.example .env
    echo ✅ Created .env file
    echo.
    echo ⚠️  IMPORTANT: Please edit .env file with your settings:
    echo    1. PostgreSQL database credentials
    echo    2. BetterAuth secret key
    echo    3. Cricket API key
    echo.
) else (
    echo ℹ️  .env file already exists
)

echo.
echo 📝 Next steps:
echo 1. Edit .env file with your configuration
echo 2. Create PostgreSQL database: cricket_analytics
echo 3. Run: npm run db:generate
echo 4. Run: npm run db:push
echo 5. Run: npm run dev
echo.
echo For detailed instructions, see SETUP_GUIDE.md
echo.
pause
