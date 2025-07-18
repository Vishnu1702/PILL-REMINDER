@echo off
echo Setting up environment...
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\Baliv\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

echo Building project...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

echo Installing APK...
adb install -r app\build\outputs\apk\debug\app-debug.apk
if %errorlevel% neq 0 (
    echo Install failed!
    pause
    exit /b %errorlevel%
)

echo Starting app...
adb shell am start -n com.balivishnu.mymedalert/.MainActivity
if %errorlevel% neq 0 (
    echo Launch failed!
    pause
    exit /b %errorlevel%
)

echo App launched successfully!
pause
