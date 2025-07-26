# Set Android development environment variables
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
$env:ANDROID_HOME = "C:\Users\Baliv\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

Write-Host "Android development environment set up:" -ForegroundColor Green
Write-Host "JAVA_HOME=$env:JAVA_HOME" -ForegroundColor Yellow
Write-Host "ANDROID_HOME=$env:ANDROID_HOME" -ForegroundColor Yellow
Write-Host ""
Write-Host "You can now run Android builds with:" -ForegroundColor Cyan
Write-Host "  npx cap sync android" -ForegroundColor White
Write-Host "  cd android; ./gradlew assembleDebug" -ForegroundColor White
Write-Host "  npx cap open android" -ForegroundColor White
