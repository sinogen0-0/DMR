# Build APK Only (No Device Required)
# Builds production-ready APK for manual distribution

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build APK (Manual Distribution)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Build web app
Write-Host "`n[1/3] Building web app..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Web build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Web build complete" -ForegroundColor Green

# Step 2: Sync to Android
Write-Host "`n[2/3] Syncing to Android..." -ForegroundColor Green
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Capacitor sync failed" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Sync complete" -ForegroundColor Green

# Step 3: Build APK
Write-Host "`n[3/3] Building APK..." -ForegroundColor Green
Set-Location android
.\gradlew.bat assembleDebug
$buildResult = $LASTEXITCODE
Set-Location ..

if ($buildResult -ne 0) {
    Write-Host "  ERROR: APK build failed" -ForegroundColor Red
    exit 1
}

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    Write-Host "  ERROR: APK not found at $apkPath" -ForegroundColor Red
    exit 1
}

$apkSize = [Math]::Round((Get-Item $apkPath).Length / 1MB, 2)
$fullPath = (Resolve-Path $apkPath).Path

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  APK Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Location: $fullPath" -ForegroundColor Yellow
Write-Host "Size: $apkSize MB" -ForegroundColor Yellow
Write-Host "`nTo install manually:" -ForegroundColor Cyan
Write-Host "1. Copy APK to your device" -ForegroundColor White
Write-Host "2. Enable 'Install from Unknown Sources'" -ForegroundColor White
Write-Host "3. Open the APK file on your device" -ForegroundColor White
Write-Host ""
