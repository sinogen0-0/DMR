# Build and Deploy APK to Device
# Builds APK and installs directly to connected Android device

param(
    [string]$DeviceSerial = "",
    [string]$DeviceModel = ""
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build & Deploy APK to Device" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

function Get-ConnectedDevices {
    param([string]$AdbPath)

    $rawLines = & $AdbPath devices -l | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
    $devices = @()

    foreach ($line in $rawLines) {
        $parts = $line -split "\s+"
        if ($parts.Count -lt 2 -or $parts[1] -ne "device") {
            continue
        }

        $serial = $parts[0]
        $model = "unknown"
        $modelMatch = [regex]::Match($line, "model:([^\s]+)")
        if ($modelMatch.Success) {
            $model = $modelMatch.Groups[1].Value
        }

        $devices += [PSCustomObject]@{
            Serial = $serial
            Model = $model
            Raw = $line
        }
    }

    return $devices
}

# Step 1: Check for connected device
Write-Host "`n[1/5] Checking for connected device..." -ForegroundColor Green
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adbPath)) {
    # Try alternative locations
    $adbPath = "C:\Android\sdk\platform-tools\adb.exe"
    if (-not (Test-Path $adbPath)) {
        Write-Host "  ERROR: adb.exe not found" -ForegroundColor Red
        Write-Host "  Please install Android SDK Platform Tools" -ForegroundColor Yellow
        Write-Host "  Download: https://developer.android.com/studio/releases/platform-tools" -ForegroundColor Yellow
        exit 1
    }
}

$devices = Get-ConnectedDevices -AdbPath $adbPath
if ($devices.Count -eq 0) {
    Write-Host "  ERROR: No devices connected" -ForegroundColor Red
    Write-Host "  Please connect your Android device via USB and enable USB debugging" -ForegroundColor Yellow
    exit 1
}

$selectedDevice = $null
if ($DeviceSerial -ne "") {
    $selectedDevice = $devices | Where-Object { $_.Serial -eq $DeviceSerial } | Select-Object -First 1
    if (-not $selectedDevice) {
        Write-Host "  ERROR: Requested serial not found: $DeviceSerial" -ForegroundColor Red
        Write-Host "  Connected devices:" -ForegroundColor Yellow
        foreach ($d in $devices) {
            Write-Host "   - $($d.Serial) (model: $($d.Model))" -ForegroundColor Yellow
        }
        exit 1
    }
}
elseif ($DeviceModel -ne "") {
    $selectedDevice = $devices | Where-Object { $_.Model -like "*$DeviceModel*" } | Select-Object -First 1
    if (-not $selectedDevice) {
        Write-Host "  ERROR: Requested model not found: $DeviceModel" -ForegroundColor Red
        Write-Host "  Connected devices:" -ForegroundColor Yellow
        foreach ($d in $devices) {
            Write-Host "   - $($d.Serial) (model: $($d.Model))" -ForegroundColor Yellow
        }
        exit 1
    }
}
elseif ($devices.Count -gt 1) {
    Write-Host "  ERROR: Multiple devices connected. Specify -DeviceSerial or -DeviceModel." -ForegroundColor Red
    Write-Host "  Connected devices:" -ForegroundColor Yellow
    foreach ($d in $devices) {
        Write-Host "   - $($d.Serial) (model: $($d.Model))" -ForegroundColor Yellow
    }
    exit 1
}
else {
    $selectedDevice = $devices[0]
}

$deviceName = $selectedDevice.Serial
Write-Host "  OK: Device connected ($deviceName, model: $($selectedDevice.Model))" -ForegroundColor Green

# Step 2: Build web app
Write-Host "`n[2/5] Building web app..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Web build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Web build complete" -ForegroundColor Green

# Step 3: Sync to Android
Write-Host "`n[3/5] Syncing to Android..." -ForegroundColor Green
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Capacitor sync failed" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Sync complete" -ForegroundColor Green

# Step 4: Build APK
Write-Host "`n[4/5] Building APK..." -ForegroundColor Green
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
Write-Host "  OK: APK built ($apkSize MB)" -ForegroundColor Green

# Step 5: Install on device
Write-Host "`n[5/5] Installing on device..." -ForegroundColor Green
Write-Host "  Device: $deviceName" -ForegroundColor Yellow
Write-Host "  Uninstalling old version..." -ForegroundColor Yellow

# Uninstall old version (ignore errors if not installed)
& $adbPath -s $deviceName uninstall com.dungeondeck.recorder 2>$null

Write-Host "  Installing new APK..." -ForegroundColor Yellow
& $adbPath -s $deviceName install $apkPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Installation failed" -ForegroundColor Red
    Write-Host "`n  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Enable 'Install from Unknown Sources' on your device" -ForegroundColor Yellow
    Write-Host "  2. Check USB debugging is enabled" -ForegroundColor Yellow
    Write-Host "  3. Authorize this computer on your device" -ForegroundColor Yellow
    exit 1
}

Write-Host "  OK: Installation complete!" -ForegroundColor Green

# Step 5.5: Apply runtime permissions (best effort)
Write-Host "`n[5.5/6] Applying Android permissions..." -ForegroundColor Green

# Grant microphone runtime permission (required for recording/transcription)
& $adbPath -s $deviceName shell pm grant com.dungeondeck.recorder android.permission.RECORD_AUDIO 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: RECORD_AUDIO granted" -ForegroundColor Green
} else {
    Write-Host "  WARN: Could not grant RECORD_AUDIO via pm grant (may already be granted or restricted by OS)" -ForegroundColor Yellow
}

# Ensure app-ops allows foreground microphone use
& $adbPath -s $deviceName shell cmd appops set com.dungeondeck.recorder RECORD_AUDIO allow 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: AppOps RECORD_AUDIO set to allow" -ForegroundColor Green
} else {
    Write-Host "  WARN: Could not set AppOps RECORD_AUDIO (non-fatal)" -ForegroundColor Yellow
}

# Step 6: Launch app
Write-Host "`n[6/6] Launching app..." -ForegroundColor Green
& $adbPath -s $deviceName shell am start -n com.dungeondeck.recorder/.MainActivity

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Device: $deviceName" -ForegroundColor Yellow
Write-Host "APK Size: $apkSize MB" -ForegroundColor Yellow
Write-Host "App should now be launching on your device!" -ForegroundColor Green
Write-Host ""
