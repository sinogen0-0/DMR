# Download ML Model for Offline Bundling
# Downloads the all-MiniLM-L6-v2 model files from HuggingFace

$ErrorActionPreference = "Stop"

$modelName = "Xenova/all-MiniLM-L6-v2"
$outputDir = "static/models/Xenova/all-MiniLM-L6-v2"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ML Model Download for Offline Use" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Model: $modelName" -ForegroundColor Yellow
Write-Host "Output: $outputDir" -ForegroundColor Yellow
Write-Host ""

# Create output directory
Write-Host "[1/6] Creating output directory..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path "$outputDir/onnx" | Out-Null

# HuggingFace model files to download
$baseUrl = "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main"
$files = @(
    @{ Path = "config.json"; Size = "1 KB" },
    @{ Path = "tokenizer.json"; Size = "466 KB" },
    @{ Path = "tokenizer_config.json"; Size = "1 KB" },
    @{ Path = "special_tokens_map.json"; Size = "1 KB" },
    @{ Path = "onnx/model_quantized.onnx"; Size = "23 MB" }
)

$totalFiles = $files.Count
$currentFile = 0

Write-Host "`n[2/6] Downloading model files..." -ForegroundColor Green

foreach ($fileInfo in $files) {
    $currentFile++
    $file = $fileInfo.Path
    $url = "$baseUrl/$file"
    $outputPath = Join-Path $outputDir $file
    
    Write-Host "  [$currentFile/$totalFiles] $file ($($fileInfo.Size))..." -ForegroundColor Yellow -NoNewline
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $outputPath -UseBasicParsing
        $actualSize = (Get-Item $outputPath).Length / 1KB
        if ($actualSize -gt 1024) {
            $actualSize = [Math]::Round($actualSize / 1024, 2)
            Write-Host " OK ($actualSize MB)" -ForegroundColor Green
        } else {
            $actualSize = [Math]::Round($actualSize, 2)
            Write-Host " OK ($actualSize KB)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n[3/6] Calculating total size..." -ForegroundColor Green
$totalSize = (Get-ChildItem -Path $outputDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
$totalSizeRounded = [Math]::Round($totalSize, 2)
Write-Host "  Total: $totalSizeRounded MB" -ForegroundColor Cyan

Write-Host "`n[4/6] Verifying model files..." -ForegroundColor Green
$allFilesExist = $true
foreach ($fileInfo in $files) {
    $file = $fileInfo.Path
    $outputPath = Join-Path $outputDir $file
    if (Test-Path $outputPath) {
        Write-Host "  OK: $file" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`nDownload incomplete! Some files are missing." -ForegroundColor Red
    exit 1
}

Write-Host "`n[5/6] Creating model manifest..." -ForegroundColor Green
$manifest = @{
    model = $modelName
    version = "1.0.0"
    downloaded = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    totalSize = "$totalSizeRounded MB"
    files = $files.Count
} | ConvertTo-Json -Depth 3

$manifest | Out-File -FilePath (Join-Path $outputDir "manifest.json") -Encoding UTF8
Write-Host "  OK: manifest.json created" -ForegroundColor Green

Write-Host "`n[6/6] Checking .gitignore..." -ForegroundColor Green
$gitignorePath = ".gitignore"
$gitignoreContent = ""
if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath -Raw
}

if ($gitignoreContent -notmatch "static/models/") {
    Write-Host "  Adding static/models/ to .gitignore..." -ForegroundColor Yellow
    Add-Content -Path $gitignorePath -Value "`n# ML Models (download with npm run download:ml-model)`nstatic/models/`n"
    Write-Host "  OK: Updated .gitignore" -ForegroundColor Green
} else {
    Write-Host "  OK: .gitignore already configured" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Model Download Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Location: $outputDir" -ForegroundColor Yellow
Write-Host "Total Size: $totalSizeRounded MB" -ForegroundColor Yellow
Write-Host "Files: $totalFiles" -ForegroundColor Yellow
Write-Host "`nYour app is now configured for 100 percent offline ML!" -ForegroundColor Green
Write-Host ""
