@echo off
setlocal EnableExtensions

cd /d "%~dp0web"
if errorlevel 1 (
  echo Failed to change directory to web folder.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Install Node.js from https://nodejs.org/ and try again.
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Created .env from .env.example
  )
)

if not exist "node_modules\" (
  if exist "package-lock.json" (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 (
    echo Dependency install failed.
    exit /b 1
  )
)

call npm run dev
exit /b %errorlevel%
