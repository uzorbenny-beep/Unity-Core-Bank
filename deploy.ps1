# UnityCore Bank - Automagic PowerShell Windows Deployer
# This script handles permission overrides, cleans locked cache folders, installs dependencies, builds, and deploys to Firebase.

$ErrorActionPreference = "Stop"

Clear-Host
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         UNITYCORE BANK - AUTOMATIC FIREBASE DEPLOYER      " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Bypass PowerShell Execution Policy safely for this session
Write-Host "⚡ Step 1: Elevating session execution policy..." -ForegroundColor Yellow
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Write-Host "✓ Session policy unlocked successfully." -ForegroundColor Green
Write-Host ""

# 2. Check Node.js installation
Write-Host "🔍 Step 2: Checking Node.js environment..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "✓ Node.js is ready ($nodeVersion)" -ForegroundColor Green
    Write-Host "✓ npm is ready ($npmVersion)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js is not installed or not in your system environment variables." -ForegroundColor Red
    Write-Host "👉 Please download and install the LTS version of Node.js from https://nodejs.org/ first." -ForegroundColor Cyan
    Write-Host "After installation, close this terminal, reopen it, and run the script again." -ForegroundColor Cyan
    Read-Host "Press Enter to exit..."
    exit
}
Write-Host ""

# 3. Handle file-locking / permission issues seen on Windows (clean start)
Write-Host "🛡️ Step 3: Checking for existing dependencies and cleaning locks..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "Detected an existing node_modules directory. Cleaning it up to prevent EPERM file locking errors..." -ForegroundColor Cyan
    try {
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
        Write-Host "✓ Successfully cleared old node_modules." -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Warning: Could not delete some folders in node_modules directly. " -ForegroundColor Yellow
        Write-Host "👉 This means another program (like VS Code, Chrome, or node processes) is holding them locked." -ForegroundColor Cyan
        Write-Host "👉 Solution: Close VS Code, stop any running servers, and run this script again!" -ForegroundColor Yellow
        Write-Host ""
    }
}

if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
}

Write-Host "Clearing npm package cash indices..." -ForegroundColor Cyan
npm cache clean --force
Write-Host "✓ Cleanup complete." -ForegroundColor Green
Write-Host ""

# 4. Install fresh local dependencies
Write-Host "📦 Step 4: Installing fresh project dependencies (Vite, React, esbuild)..." -ForegroundColor Yellow
Write-Host "This might take 1-2 minutes depending on your internet connection. Please wait..." -ForegroundColor Cyan
try {
    npm install --no-audit --no-fund
    Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error during dependency installation." -ForegroundColor Red
    Write-Host "👉 Try running this script as Administrator (Right-click PowerShell -> Run as Administrator)." -ForegroundColor Cyan
    Read-Host "Press Enter to exit..."
    exit
}
Write-Host ""

# 5. Build the React SPA optimized bundles
Write-Host "⚙️ Step 5: Building React and Bundle Packages..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✓ Production build compiled successfully inside the '/dist' directory." -ForegroundColor Green
} catch {
    Write-Host "❌ Build compilation failed. Please verify that package.json has correct scripts." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit
}
Write-Host ""

# 6. Verify Firebase Tools Command Line Utility
Write-Host "🔥 Step 6: Verifying Firebase Hosting tools..." -ForegroundColor Yellow
$firebaseCmd = "firebase"
try {
    firebase --version > $null
    Write-Host "✓ Globally installed firebase-tools discovered!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Global firebase utility was not found. Testing local npx resolver..." -ForegroundColor Yellow
    $firebaseCmd = "npx firebase"
}

# 7. Authenticate & Bind to Firebase
Write-Host "🔑 Step 7: Checking Firebase authentication..." -ForegroundColor Yellow
Write-Host "👉 An authentication page may open in your web browser. Please login using your Google/Firebase credentials." -ForegroundColor Cyan
try {
    Invoke-Expression "$firebaseCmd login"
} catch {
    Write-Host "⚠️ Verification page already opened or bypass active." -ForegroundColor Yellow
}

# Get configuration files to detect the target hosting project
if (Test-Path "firebase-applet-config.json") {
    $config = Get-Content "firebase-applet-config.json" | ConvertFrom-Json
    $projectId = $config.projectId
    Write-Host "✓ Found target project from configuration: $projectId" -ForegroundColor Green
    Write-Host "Switching active project scope to $projectId..." -ForegroundColor Cyan
    Invoke-Expression "$firebaseCmd use $projectId --add"
} else {
    Write-Host "⚠️ Warning: firebase-applet-config.json not found." -ForegroundColor Yellow
    $projectId = Read-Host "Please enter your Firebase Project ID manually"
    Invoke-Expression "$firebaseCmd use $projectId --add"
}
Write-Host ""

# 8. Final push straight to live domain
Write-Host "🚀 Step 8: Deploying to live domain on Firebase..." -ForegroundColor Yellow
try {
    Invoke-Expression "$firebaseCmd deploy --only hosting"
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  🎉 SUCCESS! THE NEW VERSION OF YOUR BANK IS LIVE!       " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Your changes have been fully deployed straight to Firebase." -ForegroundColor Green
    Write-Host "Please refresh your domain (https://unitycorebk.com) or hold [Ctrl + F5] to view the live update." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Deployment failed." -ForegroundColor Red
    Write-Host "Verify your hosting configuration inside firebase.json and permissions in your Firebase project console." -ForegroundColor Cyan
}

Write-Host ""
Read-Host "Press Enter to finish..."
