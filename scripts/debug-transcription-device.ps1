# Debug transcription failures on a connected Android device via adb.
# Captures device/app state, records logcat during reproduction, and writes a summary.

param(
    [string]$PackageName = "com.dungeondeck.recorder",
    [string]$MainActivity = ".MainActivity",
    [int]$DurationSec = 120,
    [string]$OutputRoot = ".\transcription-debug",
    [string]$DeviceSerial = "",
    [string]$DeviceModel = ""
)

$ErrorActionPreference = "Stop"

function Resolve-AdbPath {
    $candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "C:\Android\sdk\platform-tools\adb.exe",
        "adb.exe"
    )

    foreach ($candidate in $candidates) {
        try {
            if ($candidate -eq "adb.exe") {
                $null = & $candidate version 2>$null
                if ($LASTEXITCODE -eq 0) { return $candidate }
            }
            elseif (Test-Path $candidate) {
                return $candidate
            }
        }
        catch {}
    }

    throw "adb.exe not found. Install Android SDK Platform Tools."
}

function Write-Section([string]$Title) {
    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Save-CmdOutput([string]$Path, [scriptblock]$CommandBlock) {
    try {
        & $CommandBlock | Out-File -FilePath $Path -Encoding utf8
    }
    catch {
        "Failed to capture output: $($_.Exception.Message)" | Out-File -FilePath $Path -Encoding utf8
    }
}

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

$adb = Resolve-AdbPath

Write-Section "1) Device Check"
$connectedDevices = Get-ConnectedDevices -AdbPath $adb
if (-not $connectedDevices -or $connectedDevices.Count -eq 0) {
    throw "No authorized Android device found. Connect device, enable USB debugging, and authorize host."
}

$selectedDevice = $null
if ($DeviceSerial -ne "") {
    $selectedDevice = $connectedDevices | Where-Object { $_.Serial -eq $DeviceSerial } | Select-Object -First 1
    if (-not $selectedDevice) {
        Write-Host "Connected devices:" -ForegroundColor Yellow
        foreach ($d in $connectedDevices) {
            Write-Host "  - $($d.Serial) (model: $($d.Model))" -ForegroundColor Yellow
        }
        throw "Requested serial not found: $DeviceSerial"
    }
}
elseif ($DeviceModel -ne "") {
    $selectedDevice = $connectedDevices | Where-Object { $_.Model -like "*$DeviceModel*" } | Select-Object -First 1
    if (-not $selectedDevice) {
        Write-Host "Connected devices:" -ForegroundColor Yellow
        foreach ($d in $connectedDevices) {
            Write-Host "  - $($d.Serial) (model: $($d.Model))" -ForegroundColor Yellow
        }
        throw "Requested model not found: $DeviceModel"
    }
}
elseif ($connectedDevices.Count -gt 1) {
    Write-Host "Connected devices:" -ForegroundColor Yellow
    foreach ($d in $connectedDevices) {
        Write-Host "  - $($d.Serial) (model: $($d.Model))" -ForegroundColor Yellow
    }
    throw "Multiple devices connected. Use -DeviceSerial or -DeviceModel."
}
else {
    $selectedDevice = $connectedDevices[0]
}

$deviceId = $selectedDevice.Serial
Write-Host "Device: $deviceId (model: $($selectedDevice.Model))" -ForegroundColor Green

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $OutputRoot "$($PackageName)-$timestamp"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

Write-Section "2) Capture Device/App State"
Save-CmdOutput (Join-Path $outDir "device-getprop.txt") { & $adb -s $deviceId shell getprop }
Save-CmdOutput (Join-Path $outDir "package-dumpsys.txt") { & $adb -s $deviceId shell dumpsys package $PackageName }
Save-CmdOutput (Join-Path $outDir "appops.txt") { & $adb -s $deviceId shell cmd appops get $PackageName }
Save-CmdOutput (Join-Path $outDir "voice-recognition-service.txt") { & $adb -s $deviceId shell settings get secure voice_recognition_service }
Save-CmdOutput (Join-Path $outDir "packages.txt") { & $adb -s $deviceId shell pm list packages }
Save-CmdOutput (Join-Path $outDir "audio-dumpsys.txt") { & $adb -s $deviceId shell dumpsys audio }
Save-CmdOutput (Join-Path $outDir "connectivity-dumpsys.txt") { & $adb -s $deviceId shell dumpsys connectivity }

Write-Host "Snapshots written to: $outDir" -ForegroundColor Green

Write-Section "3) Logcat Capture During Repro"
Write-Host "Launching app and recording logs for $DurationSec seconds." -ForegroundColor Yellow
Write-Host "Reproduce transcription issue now..." -ForegroundColor Yellow

$logFile = Join-Path $outDir "logcat.txt"
& $adb -s $deviceId logcat -c
& $adb -s $deviceId shell am start -n "$PackageName/$MainActivity" | Out-Null

$job = Start-Job -ScriptBlock {
    param($adbPath, $dev, $output)
    & $adbPath -s $dev logcat -v time *:V | Out-File -FilePath $output -Encoding utf8
} -ArgumentList $adb, $deviceId, $logFile

Start-Sleep -Seconds $DurationSec

Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
Receive-Job $job -ErrorAction SilentlyContinue | Out-Null
Remove-Job $job -Force -ErrorAction SilentlyContinue

Write-Host "Log capture complete." -ForegroundColor Green

Write-Section "4) Analyze Likely Causes"
$summaryPath = Join-Path $outDir "summary.txt"
$summary = New-Object System.Collections.Generic.List[string]

$summary.Add("Transcription Debug Summary")
$summary.Add("Generated: $(Get-Date)")
$summary.Add("Package: $PackageName")
$summary.Add("Device: $deviceId")
$summary.Add("")

$pkgDump = Get-Content (Join-Path $outDir "package-dumpsys.txt") -ErrorAction SilentlyContinue
$appOps = Get-Content (Join-Path $outDir "appops.txt") -ErrorAction SilentlyContinue
$logs = Get-Content $logFile -ErrorAction SilentlyContinue

if ($pkgDump -notmatch "android.permission.RECORD_AUDIO:\s+granted=true") {
    $summary.Add("HIGH: RECORD_AUDIO permission is not granted.")
    $summary.Add("Fix: Grant microphone permission in app settings and retry.")
    $summary.Add("")
}

if ($appOps -match "RECORD_AUDIO:\s+deny|RECORD_AUDIO:\s+ignore") {
    $summary.Add("HIGH: AppOps is blocking RECORD_AUDIO (deny/ignore).")
    $summary.Add("Fix: Reset permissions or run: adb shell cmd appops set $PackageName RECORD_AUDIO allow")
    $summary.Add("")
}

$patterns = @(
    @{ Name = "Permission denied"; Regex = "SecurityException|permission denied|RECORD_AUDIO.*denied|ERROR_INSUFFICIENT_PERMISSIONS"; Severity = "HIGH"; Fix = "Mic permission missing or blocked." },
    @{ Name = "Speech service unavailable"; Regex = "RecognitionService.*not available|SpeechRecognizer|ERROR_CLIENT|ERROR_SERVER"; Severity = "HIGH"; Fix = "No functional recognition service (often Google app/service disabled)." },
    @{ Name = "Network failure"; Regex = "ERROR_NETWORK|UnknownHostException|timeout|SSLHandshakeException"; Severity = "MEDIUM"; Fix = "Connectivity or TLS failure; many recognizers need network." },
    @{ Name = "Recognizer busy/no match/timeout"; Regex = "ERROR_RECOGNIZER_BUSY|ERROR_NO_MATCH|ERROR_SPEECH_TIMEOUT"; Severity = "MEDIUM"; Fix = "Recognizer lifecycle timing or silence threshold issue." },
    @{ Name = "Audio input failure"; Regex = "AudioRecord|startRecording|audioflinger|dead object|mic"; Severity = "MEDIUM"; Fix = "Mic busy/routing/initialization problem." },
    @{ Name = "App crash"; Regex = "FATAL EXCEPTION|AndroidRuntime|Process:\s+$PackageName"; Severity = "HIGH"; Fix = "Crash during transcription workflow." }
)

foreach ($pattern in $patterns) {
    $hits = $logs | Select-String -Pattern $pattern.Regex -SimpleMatch:$false
    if ($hits -and $hits.Count -gt 0) {
        $summary.Add("$($pattern.Severity): $($pattern.Name) detected ($($hits.Count) hits).")
        $summary.Add("Likely cause: $($pattern.Fix)")
        $summary.Add("")
        $hits | Select-Object -First 20 | ForEach-Object { $summary.Add("  " + $_.Line) }
        $summary.Add("")
    }
}

if ($summary.Count -lt 8) {
    $summary.Add("No obvious transcription failure signatures were detected in this capture window.")
    $summary.Add("Next: run again with a longer DurationSec and reproduce exact steps during capture.")
}

$summary | Set-Content -Path $summaryPath -Encoding utf8

Write-Section "Done"
Write-Host "Artifacts saved to: $outDir" -ForegroundColor Green
Write-Host "Summary: $summaryPath" -ForegroundColor Green
Write-Host "Raw logs: $logFile" -ForegroundColor Green
