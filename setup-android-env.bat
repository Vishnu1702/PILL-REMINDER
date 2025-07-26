@echo off
title Android Development Environment Setup

echo.
echo =================================================
echo   ANDROID DEVELOPMENT ENVIRONMENT SETUP
echo =================================================
echo.

echo Setting up environment variables...
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
set "ANDROID_HOME=C:\Users\Baliv\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

echo.
echo ✅ Environment variables configured:
echo    JAVA_HOME = %JAVA_HOME%
echo    ANDROID_HOME = %ANDROID_HOME%
echo.

echo 🚀 Available commands:
echo    npx cap sync android          - Sync Capacitor with Android
echo    cd android ^&^& gradlew assembleDebug - Build Android APK
echo    npx cap open android          - Open in Android Studio
echo.

echo 📱 Your medicine reminder app is ready for Android development!
echo.
pause
