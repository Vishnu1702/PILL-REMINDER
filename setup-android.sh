#!/bin/bash
# Android Development Environment Setup Script

echo "🔧 Setting up Android development environment..."

# Set environment variables
export JAVA_HOME="C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
export ANDROID_HOME="C:\Users\Baliv\AppData\Local\Android\Sdk"
export PATH="$JAVA_HOME\bin:$ANDROID_HOME\platform-tools:$PATH"

echo "✅ Environment variables set:"
echo "   JAVA_HOME=$JAVA_HOME"
echo "   ANDROID_HOME=$ANDROID_HOME"
echo ""
echo "🚀 You can now run:"
echo "   npx cap sync android"
echo "   cd android && ./gradlew assembleDebug"
echo "   npx cap open android"
