param(
  [int]$Port = 5173,
  [switch]$SkipPull,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

function Require-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. $InstallHint"
  }
}

Require-Command "node" "Install Node.js from https://nodejs.org/"
Require-Command "npm" "Install Node.js from https://nodejs.org/"

if (-not $SkipPull) {
  if (Get-Command "git" -ErrorAction SilentlyContinue) {
    Write-Host "Updating from GitHub..."
    git pull --ff-only origin main
  } else {
    Write-Host "Git was not found. Skipping update from GitHub."
  }
}

if (-not $SkipInstall) {
  Write-Host "Installing app packages..."
  npm install
}

Write-Host ""
Write-Host "Starting Tobolar Procurement..."
Write-Host "Open http://127.0.0.1:$Port in your browser."
Write-Host "Press Ctrl+C in this window to stop the app."
Write-Host ""

npm run dev -- --host 127.0.0.1 --port $Port
