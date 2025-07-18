#!/usr/bin/env pwsh
# Android Build Fix Script for MyMedAlert

Write-Host "Starting Android Build Fix Process..." -ForegroundColor Green

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Yellow
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\Baliv\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools;$env:PATH"

Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan
Write-Host "ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Cyan

# Clean all caches
Write-Host "Cleaning all caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.idea" -ErrorAction SilentlyContinue

# Build web assets
Write-Host "Building web assets..." -ForegroundColor Yellow
npm run build

# Sync with Capacitor
Write-Host "Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync android

# Try to run with Capacitor
Write-Host "Trying to run with Capacitor..." -ForegroundColor Yellow
npx cap run android --no-sync

Write-Host "Build process completed!" -ForegroundColor Green
Read-Host "Press Enter to exit..."
