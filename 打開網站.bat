@echo off
chcp 65001
cls

echo ==========================================
echo 🏥 AI 醫學新聞網 - 網站伺服器
echo ==========================================
echo.
echo 🚀 正在啟動 Next.js 網站...
echo 🌐 啟動後請在瀏覽器輸入: http://localhost:3000
echo.

:: 切換到當前檔案所在的目錄
cd /d "%~dp0"

:: 執行啟動指令
npm run dev

pause