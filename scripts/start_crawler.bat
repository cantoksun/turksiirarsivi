@echo off
chcp 65001 > nul
title Raff Antoloji Siir Arsivleme Motoru
echo ========================================================
echo   Raff Culture - Antoloji.com Siir Arsivleme Botu
echo ========================================================
echo.
cd /d "%~dp0"
node --max-old-space-size=4096 antoloji_crawler.js
pause
