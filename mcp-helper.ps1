#!/usr/bin/env pwsh

# MyMedAlert Repository MCP Helper Script
# This script helps you interact with your GitHub repository using Model Context Protocol

Write-Host "🚀 MyMedAlert Repository MCP Helper" -ForegroundColor Green
Write-Host "Repository: https://github.com/Vishnu1702/PILL-REMINDER" -ForegroundColor Cyan
Write-Host ""

function Show-RepoStatus {
    Write-Host "📊 Repository Status:" -ForegroundColor Yellow
    git status --porcelain
    if ($LASTEXITCODE -eq 0 -and (git status --porcelain).Count -eq 0) {
        Write-Host "✅ Working directory clean" -ForegroundColor Green
    }
    
    Write-Host "`n🌿 Current Branch:" -ForegroundColor Yellow
    git branch --show-current
    
    Write-Host "`n📝 Recent Commits:" -ForegroundColor Yellow
    git log --oneline -5
}

function Sync-Repository {
    Write-Host "🔄 Syncing with remote repository..." -ForegroundColor Blue
    
    # Pull latest changes
    git pull origin master
    
    # Show status
    Show-RepoStatus
}

function Push-Changes {
    param(
        [string]$CommitMessage = "Update: Repository changes"
    )
    
    Write-Host "📤 Pushing changes to GitHub..." -ForegroundColor Blue
    
    # Add all changes
    git add .
    
    # Commit with message
    git commit -m $CommitMessage
    
    # Push to remote
    git push origin master
    
    Write-Host "✅ Changes pushed successfully!" -ForegroundColor Green
}

function Show-ProjectInfo {
    Write-Host "📱 MyMedAlert - Medicine Reminder App" -ForegroundColor Magenta
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "🏠 Repository: https://github.com/Vishnu1702/PILL-REMINDER" -ForegroundColor White
    Write-Host "📧 Contact: balivishnu.cs@gmail.com" -ForegroundColor White
    Write-Host "📄 License: MIT" -ForegroundColor White
    Write-Host "🔒 Privacy: Local storage only, no cloud sync" -ForegroundColor White
    Write-Host ""
    Write-Host "🛠️  Tech Stack:" -ForegroundColor Cyan
    Write-Host "   • React 18 + Vite" -ForegroundColor White
    Write-Host "   • Tailwind CSS" -ForegroundColor White
    Write-Host "   • Capacitor (Android/iOS)" -ForegroundColor White
    Write-Host "   • Local Notifications" -ForegroundColor White
    Write-Host ""
    Write-Host "✨ Key Features:" -ForegroundColor Cyan
    Write-Host "   • Privacy-first architecture" -ForegroundColor White
    Write-Host "   • Cross-platform support" -ForegroundColor White
    Write-Host "   • Multi-patient management" -ForegroundColor White
    Write-Host "   • Smart medication reminders" -ForegroundColor White
    Write-Host "   • Offline functionality" -ForegroundColor White
}

function Show-DevCommands {
    Write-Host "🔧 Development Commands:" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "npm run dev          # Start development server" -ForegroundColor White
    Write-Host "npm run build        # Build for production" -ForegroundColor White
    Write-Host "npx cap sync android # Sync with Android" -ForegroundColor White
    Write-Host "npx cap open android # Open in Android Studio" -ForegroundColor White
    Write-Host "git status           # Check Git status" -ForegroundColor White
    Write-Host "git log --oneline -5 # Show recent commits" -ForegroundColor White
}

# Main menu
do {
    Write-Host "`n" + "="*50 -ForegroundColor Gray
    Write-Host "MCP Repository Helper - Select an option:" -ForegroundColor Green
    Write-Host "1. Show Project Information" -ForegroundColor White
    Write-Host "2. Show Repository Status" -ForegroundColor White
    Write-Host "3. Sync with Remote Repository" -ForegroundColor White
    Write-Host "4. Push Changes to GitHub" -ForegroundColor White
    Write-Host "5. Show Development Commands" -ForegroundColor White
    Write-Host "6. Exit" -ForegroundColor White
    Write-Host "="*50 -ForegroundColor Gray
    
    $choice = Read-Host "Enter your choice (1-6)"
    
    switch ($choice) {
        "1" { Show-ProjectInfo }
        "2" { Show-RepoStatus }
        "3" { Sync-Repository }
        "4" { 
            $message = Read-Host "Enter commit message (or press Enter for default)"
            if ([string]::IsNullOrWhiteSpace($message)) {
                Push-Changes
            } else {
                Push-Changes -CommitMessage $message
            }
        }
        "5" { Show-DevCommands }
        "6" { 
            Write-Host "👋 Goodbye! Happy coding!" -ForegroundColor Green
            break 
        }
        default { Write-Host "❌ Invalid choice. Please select 1-6." -ForegroundColor Red }
    }
    
    if ($choice -ne "6") {
        Read-Host "`nPress Enter to continue..."
    }
    
} while ($choice -ne "6")
