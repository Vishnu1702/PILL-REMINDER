@echo off
REM Set Android development environment variables
set JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot
set ANDROID_HOME=C:\Users\Baliv\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

echo Android development environment set up:
echo JAVA_HOME=%JAVA_HOME%
echo ANDROID_HOME=%ANDROID_HOME%
echo.
echo You can now run Android builds with:
echo   npx cap sync android
echo   cd android ^&^& gradlew assembleDebug
echo   npx cap open android
