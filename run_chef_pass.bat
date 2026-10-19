@echo off
title Bistro Robotique - Chef Pass Station (:5176)
echo ========================================================
echo   CHEF PASS DISPATCH STATION - ISOLATED HOST
echo ========================================================
echo Starting independent Chef Pass on http://localhost:5176 ...
cd frontend
npm run dev:chef
pause
