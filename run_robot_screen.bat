@echo off
title Bistro Robotique - Robot Touchscreen Kiosk (:5177)
echo ========================================================
echo   ROBOT BODY TOUCHSCREEN KIOSK - ISOLATED HOST
echo ========================================================
echo Starting independent Robot Screen on http://localhost:5177 ...
cd frontend
npm run dev:robot
pause
