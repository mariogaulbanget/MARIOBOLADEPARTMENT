@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang.
  echo Install Node.js LTS dari https://nodejs.org/ lalu jalankan file ini lagi.
  pause
  exit /b 1
)
node scripts\update-data.js
if errorlevel 1 (
  echo.
  echo Update gagal. Periksa format data\schedule.json dan data\news.json.
  pause
  exit /b 1
)
echo.
echo Update selesai. Upload perubahan data ke repository atau Cloudflare Pages.
pause
