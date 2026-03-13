#!/usr/bin/env pwsh
# 勤怠アプリ - 携帯からアクセスするためのスクリプト
# Usage: 右クリック → PowerShellで実行

$ErrorActionPreference = "SilentlyContinue"
$Host.UI.RawUI.WindowTitle = "Kintai App - Mobile Access"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  勤怠アプリ - 携帯アクセス用セットアップ" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Move to script directory
Set-Location $PSScriptRoot

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js がインストールされていません" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/3] 開発サーバーを起動中..." -ForegroundColor Yellow

# Start Next.js dev server as background job
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot
    npx next dev -p 3000 -H 0.0.0.0 2>&1
}

Write-Host "       サーバーの起動を待っています..." -ForegroundColor Gray

# Wait for server to be ready
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        $ready = $true
        break
    } catch {
        Write-Host "." -NoNewline
    }
}
Write-Host ""

if (-not $ready) {
    Write-Host "[WARN] サーバーの起動に時間がかかっています。続行します..." -ForegroundColor Yellow
}

Write-Host "[2/3] サーバー起動完了!" -ForegroundColor Green
Write-Host "[3/3] 外部公開トンネルを作成中..." -ForegroundColor Yellow
Write-Host ""

# Get local IP for LAN access
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress

Write-Host "============================================" -ForegroundColor Green
Write-Host "  同じWi-Fi内のアクセス:" -ForegroundColor White
Write-Host "  http://${localIP}:3000/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "  外部アクセス (トンネル作成中...):" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Use localtunnel for external access
npx --yes localtunnel --port 3000 --print-requests

# Cleanup on exit
Write-Host ""
Write-Host "サーバーを停止中..." -ForegroundColor Yellow
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -Force -ErrorAction SilentlyContinue
Write-Host "完了" -ForegroundColor Green
