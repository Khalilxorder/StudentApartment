@echo off
REM ============================================================
REM GitHub Upload Script for Student Apartments
REM Username: Khalilkorder
REM Repository: SA (or student-apartments)
REM ============================================================

cd /d "C:\Users\Administrator\Desktop\SA-GitHub-Upload"

echo.
echo ============================================================
echo   Uploading to GitHub - Khalilkorder/SA
echo ============================================================
echo.

REM Step 1: Initialize Git
echo [1/5] Initializing Git repository...
git init
if errorlevel 1 (
    echo ERROR: Git init failed
    exit /b 1
)

REM Step 2: Add all files
echo [2/5] Adding all files...
git add .
if errorlevel 1 (
    echo ERROR: Git add failed
    exit /b 1
)

REM Step 3: Create initial commit
echo [3/5] Creating initial commit...
git commit -m "Initial commit: Student Apartments - AI-powered housing marketplace platform"
if errorlevel 1 (
    echo ERROR: Git commit failed
    exit /b 1
)

REM Step 4: Set remote origin
echo [4/5] Setting remote origin...
git remote add origin https://github.com/Khalilkorder/SA.git
if errorlevel 1 (
    echo ERROR: Git remote add failed
    exit /b 1
)

REM Step 5: Push to GitHub
echo [5/5] Pushing to GitHub (this may take a moment)...
git branch -M main
git push -u origin main
if errorlevel 1 (
    echo ERROR: Git push failed
    exit /b 1
)

echo.
echo ============================================================
echo   SUCCESS! Repository uploaded to GitHub
echo ============================================================
echo   URL: https://github.com/Khalilkorder/SA
echo   Branch: main
echo ============================================================
echo.
pause
