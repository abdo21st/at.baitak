@echo off
title بناء تطبيق المزامنة التنفيذي المستقل (Single EXE Builder)
color 0B
chcp 65001 >nul
echo ===================================================================
echo   📦 جاري تجميع وبناء ملف PharmacySyncAgent.exe المستقل...
echo ===================================================================
cd /d %~dp0

echo [1/3] Bundling with ncc...
call npx -y @vercel/ncc build sync-agent.js -o dist

echo [2/3] Generating SEA preparation blob...
call node --experimental-sea-config sea-config.json

echo [3/3] Creating and injecting standalone EXE...
powershell -Command "Copy-Item (Get-Command node).Source -Destination 'PharmacySyncAgent.exe'"
call npx -y postject PharmacySyncAgent.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

echo ===================================================================
echo   ✅ تم إنشاء ملف PharmacySyncAgent.exe بنجاح تام!
echo   🚀 يمكنك الآن تشغيل الملف مباشرة أو نقله لأي جهاز صيدلية.
echo ===================================================================
pause
