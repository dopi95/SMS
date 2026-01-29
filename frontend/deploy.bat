@echo off
echo 🚀 Starting deployment process...

REM Check if we're in the frontend directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the frontend directory.
    exit /b 1
)

REM Clean previous build
echo 🧹 Cleaning previous build...
if exist ".next" rmdir /s /q .next

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Run build
echo 🔨 Building application...
npm run build

if %errorlevel% equ 0 (
    echo ✅ Build successful! Ready for deployment.
    echo 📋 Build summary:
    echo    - TypeScript compilation: ✅
    echo    - Static generation: ✅
    echo    - Environment: Production
    echo.
    echo 🌐 Your app is ready to be deployed to Vercel!
) else (
    echo ❌ Build failed! Please check the errors above.
    exit /b 1
)