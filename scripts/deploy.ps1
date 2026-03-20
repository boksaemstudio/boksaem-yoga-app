param (
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = "Auto deploy: updates",
    [switch]$SkipLint
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Local CI/CD Pipeline..." -ForegroundColor Cyan

# 1. Update Version Info
Write-Host "📅 Updating version timestamp..." -ForegroundColor Yellow
node scripts/update_version.js

# 2. Linting (Optional)
if (-not $SkipLint) {
    Write-Host "🔍 Running linter..." -ForegroundColor Yellow
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Linting failed. Please fix errors before deploying." -ForegroundColor Red
        exit 1
    }
}

# 3. Build Production
Write-Host "📦 Building production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed." -ForegroundColor Red
    exit 1
}

# 4. Deploy to Firebase
Write-Host "☁️ Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase deployment failed." -ForegroundColor Red
    exit 1
}

# 5. Git Commit & Push
Write-Host "🐙 Pushing to repository..." -ForegroundColor Yellow
git add .
git commit -m $CommitMessage
git push origin HEAD

Write-Host "✅ CI/CD Pipeline completed successfully!" -ForegroundColor Green
