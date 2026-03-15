#!/bin/bash

# Deployment script for SMS Frontend
echo "🚀 Starting deployment process..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run build
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Ready for deployment."
    echo "📋 Build summary:"
    echo "   - TypeScript compilation: ✅"
    echo "   - Static generation: ✅"
    echo "   - Environment: Production"
    echo ""
    echo "🌐 Your app is ready to be deployed to Vercel!"
else
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi