#!/usr/bin/env pwsh

Write-Host "Setting up environment..." -ForegroundColor Green
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\Baliv\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

Write-Host "Building project..." -ForegroundColor Green
Set-Location android
try {
    & .\gradlew assembleDebug
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed!" -ForegroundColor Red
        Read-Host "Press Enter to continue..."
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Build failed with error: $_" -ForegroundColor Red
    Read-Host "Press Enter to continue..."
    exit 1
}

Write-Host "Installing APK..." -ForegroundColor Green
try {
    & adb install -r app\build\outputs\apk\debug\app-debug.apk
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Install failed!" -ForegroundColor Red
        Read-Host "Press Enter to continue..."
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Install failed with error: $_" -ForegroundColor Red
    Read-Host "Press Enter to continue..."
    exit 1
}

Write-Host "Starting app..." -ForegroundColor Green
try {
    & adb shell am start -n com.balivishnu.mymedalert/.MainActivity
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Launch failed!" -ForegroundColor Red
        Read-Host "Press Enter to continue..."
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Launch failed with error: $_" -ForegroundColor Red
    Read-Host "Press Enter to continue..."
    exit 1
}

Write-Host "App launched successfully!" -ForegroundColor Green
Read-Host "Press Enter to continue..."
