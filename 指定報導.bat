@echo off
chcp 65001
cls

echo ==========================================
echo 🕵️ AI 醫學新聞網 - 指定論文特派員
echo ==========================================
echo.

cd /d "%~dp0"
node scripts/manual-fetch.js

echo.
pause