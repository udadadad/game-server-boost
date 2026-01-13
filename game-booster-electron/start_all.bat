@echo off
title CyberBoost Infrastructure Starter
echo [SYSTEM] Starting CyberBoost Server and Bot...

:: Check if directories exist
if not exist "server" (
    echo [ERROR] Folder 'server' not found! Run this script from the project root.
    pause
    exit /b
)
if not exist "bot" (
    echo [ERROR] Folder 'bot' not found!
    pause
    exit /b
)

:: Start Server in a new window
echo [SERVER] Initializing License Server on port 3000...
start cmd /k "cd server && npm start"

:: Wait a few seconds for the server to bind before starting the bot
echo [SYSTEM] Waiting for server to initialize...
timeout /t 5 /nobreak > nul

:: Start Bot in a new window
echo [BOT] Initializing Telegram Shop Bot...
start cmd /k "cd bot && npm start"

echo.
echo [COMPLETE] Both processes are running in separate windows.
echo [INFO] Close the terminal windows to stop the individual processes.
echo.
pause
