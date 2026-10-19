@echo off
title Bistro Robotique - Kitchen Display System (:5175)
echo ========================================================
echo   KITCHEN DISPLAY SYSTEM (KDS) - ISOLATED HOST
echo ========================================================
echo Starting independent Kitchen Display on http://localhost:5175 ...
cd frontend
npm run dev:kitchen
pause
