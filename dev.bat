@echo off
rem ---------------------------------------------------------------------------
rem  Life OS: start the backend (Flask) and the frontend (Vite) together,
rem  inside THIS terminal. Press Ctrl+C to stop both.
rem
rem    Run from the project root:   .\dev.bat        (PowerShell)
rem                                 dev.bat           (cmd)
rem
rem  The real work happens in scripts\dev.ps1 so that both servers are always
rem  shut down cleanly (a plain batch file would leave the backend running
rem  after Ctrl+C). If you see "Terminate batch job (Y/N)?" just press Y.
rem ---------------------------------------------------------------------------
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1" %*
set "code=%errorlevel%"

rem Code 10 means "could not start / a server crashed": keep the window open so
rem the message can be read when the file was double-clicked.
if "%code%"=="10" (
    echo.
    pause
)
exit /b %code%
