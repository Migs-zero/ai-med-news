@echo off
chcp 65001
cls

echo ==========================================
echo 🗑️ AI 醫學新聞網 - 文章刪除系統
echo ==========================================
echo.

cd /d "%~dp0"
node scripts/delete-news.js

echo.
pause