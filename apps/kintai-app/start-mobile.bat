@echo off
chcp 65001 >nul
title Kintai App - Mobile Access

echo.
echo ==========================================
echo   Kintai App - Mobile Access Server
echo ==========================================
echo.

cd /d "%~dp0"

:: --- Check ngrok ---
where ngrok >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "%USERPROFILE%\Downloads\ngrok-v3-stable-windows-amd64.zip" (
        echo [1/4] Extracting ngrok from Downloads...
        powershell -Command "Expand-Archive -Force '%USERPROFILE%\Downloads\ngrok-v3-stable-windows-amd64.zip' '%~dp0'"
    )
)

:: Check again - maybe in current folder
if exist "%~dp0ngrok.exe" (
    set "NGROK=%~dp0ngrok.exe"
    echo [1/4] ngrok OK (local)
) else (
    where ngrok >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] ngrok not found.
        echo         Put ngrok.exe in this folder, or install via https://ngrok.com/download
        pause
        exit /b 1
    )
    set "NGROK=ngrok"
    echo [1/4] ngrok OK (PATH)
)

:: --- Set authtoken ---
echo [2/4] Setting ngrok authtoken...
%NGROK% config add-authtoken 3AZ0zT3i24AWKKNToWQf78nrt8q_6yxQPBKztdmQXBxGoYiED >nul 2>nul
echo        Done

:: --- Start Next.js ---
echo [3/4] Starting dev server...
start /b cmd /c "npx next dev -H 0.0.0.0 -p 3000 2>nul"

echo        Waiting for server (20 sec)...
timeout /t 20 /nobreak >nul

:: --- Start ngrok ---
echo [4/4] Starting ngrok tunnel...
echo.
echo ==========================================
echo   Copy the https://xxxx.ngrok-free.app
echo   URL below and open on your phone!
echo   Add /login at the end.
echo ==========================================
echo.

%NGROK% http 3000

taskkill /f /im node.exe >nul 2>nul
echo Server stopped.
pause
