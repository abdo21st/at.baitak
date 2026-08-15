@echo off
title Pharmacy Infinity Cloud Realtime Sync Agent
color 0A
echo ========================================================
echo   Starting Pharmacy Infinity Cloud Realtime Sync Agent...
echo   Target: https://at.baitak.mtapp.ly/api/pharmacy/sync
echo ========================================================
cd /d %~dp0
node sync-agent.js
pause
