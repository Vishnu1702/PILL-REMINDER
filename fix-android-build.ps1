#!/usr/bin/env pwsh
# Android Build Fix Script for MyMedAlert

Write-Host "🔧 Starting Android Build Fix Process..." -ForegroundColor Green

# Set environment variables
Write-Host "📝 Setting environment variables..." -ForegroundColor Yellow
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\Baliv\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools;$env:PATH"

# Verify environment
Write-Host "🔍 Verifying environment..." -ForegroundColor Yellow
Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan
Write-Host "ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Cyan

# Clean all caches
Write-Host "🧹 Cleaning all caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.idea" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue

# Build web assets
Write-Host "🌐 Building web assets..." -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Web build failed"
    }
} catch {
    Write-Host "❌ Web build failed: $_" -ForegroundColor Red
    exit 1
}

# Sync with Capacitor
Write-Host "🔄 Syncing with Capacitor..." -ForegroundColor Yellow
try {
    npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        throw "Capacitor sync failed"
    }
} catch {
    Write-Host "❌ Capacitor sync failed: $_" -ForegroundColor Red
    exit 1
}

# Try to build Android project
Write-Host "🏗️ Building Android project..." -ForegroundColor Yellow
Set-Location android
try {
    & .\gradlew clean
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle clean failed"
    }
    
    & .\gradlew assembleDebug
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed"
    }
    
    Write-Host "✅ Android build successful!" -ForegroundColor Green
    Write-Host "📱 APK location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
    
    } catch {
        Write-Host "❌ Android build failed: $_" -ForegroundColor Red
        Write-Host "🔧 Trying alternative approach..." -ForegroundColor Yellow
        
        # Try using Capacitor run instead
        Set-Location ..
        try {
            npx cap run android --no-sync
            Write-Host "✅ Capacitor run successful!" -ForegroundColor Green
        } catch {
            Write-Host "❌ All build attempts failed" -ForegroundColor Red
            Write-Host "💡 Try opening the project in Android Studio manually:" -ForegroundColor Yellow
            Write-Host "   1. Open Android Studio" -ForegroundColor White
            Write-Host "   2. Open the android folder as a project" -ForegroundColor White
            Write-Host "   3. Let Android Studio sync and build" -ForegroundColor White
            Write-Host "   4. Run the app from Android Studio" -ForegroundColor White
        }
    }

Write-Host "🎯 Build process completed!" -ForegroundColor Green
Read-Host "Press Enter to exit..."
