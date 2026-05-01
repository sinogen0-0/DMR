param(
  [string]$Project = "dungeon-deck-recorder",
  [string]$Scope = "jacob-pierces-projects",
  [string]$TempPath = "$env:TEMP\dmr-prod-nogit"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
  Write-Host "Building web app..."
  npm run build

  if (Test-Path $TempPath) {
    Remove-Item -Recurse -Force $TempPath
  }

  New-Item -ItemType Directory -Path $TempPath | Out-Null

  Write-Host "Copying static build to temp deploy folder..."
  Copy-Item -Path (Join-Path $repoRoot "build\*") -Destination $TempPath -Recurse -Force

  # Force static deployment from temp folder (no git metadata from repo).
  $vercelConfig = '{"version":2,"buildCommand":"echo skip","outputDirectory":".","routes":[{"handle":"filesystem"},{"src":"/.*","dest":"/index.html"}]}'
  Set-Content -Path (Join-Path $TempPath "vercel.json") -Value $vercelConfig -Encoding ascii

  Write-Host "Linking temp folder to $Scope/$Project..."
  npx -y vercel link --cwd $TempPath --yes --project $Project --scope $Scope

  Write-Host "Deploying to production..."
  npx -y vercel deploy --cwd $TempPath --prod --yes --scope $Scope --logs --force
}
finally {
  Pop-Location
}
