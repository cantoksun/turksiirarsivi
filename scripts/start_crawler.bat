@echo off
chcp 65001 > nul
title türk şiir arşivi tarama motoru
echo ========================================================
echo   türk şiir arşivi - antoloji.com tarama motoru
echo ========================================================
echo.
cd /d "%~dp0"
node --max-old-space-size=4096 antoloji_crawler.js
pause
