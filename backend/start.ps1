# SachBite - PowerShell Start Script
# Yeh script backend folder me jaakar dependencies install karega aur server start karega

Write-Host "🛵 SachBite Server Setup Shuru Ho Raha Hai..." -ForegroundColor Yellow

# Script jis folder me hai wahi backend folder maana ja raha hai
Set-Location -Path $PSScriptRoot

# Check karo Node.js install hai ya nahi
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "❌ Node.js install nahi mila! Pehle https://nodejs.org se install karein." -ForegroundColor Red
    Read-Host "Enter dabakar band karein"
    exit
}

Write-Host "✅ Node.js mil gaya: $(node -v)" -ForegroundColor Green

# Agar node_modules folder nahi hai, to npm install karo
if (-not (Test-Path ".\node_modules")) {
    Write-Host "📦 Dependencies install kar raha hoon (npm install)..." -ForegroundColor Cyan
    npm install
} else {
    Write-Host "✅ Dependencies pehle se installed hain." -ForegroundColor Green
}

# Server start karo
Write-Host "🚀 Server start ho raha hai..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Browser me yeh links kholein:" -ForegroundColor Yellow
Write-Host "   Home Page:  http://localhost:3000/index.html"
Write-Host "   Dashboard:  http://localhost:3000/dashboard.html"
Write-Host "   Checkout:   http://localhost:3000/checkout.html"
Write-Host ""
Write-Host "Server band karne ke liye Ctrl+C dabayein." -ForegroundColor DarkGray
Write-Host ""

npm start
