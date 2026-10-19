@echo off
title Bistro Robotique - Admin Operations & Teleop (:5178)
echo ========================================================
echo   ADMIN OPERATIONS & TELEOP CONSOLE - ISOLATED HOST
echo ========================================================
echo Starting independent Admin Dashboard on http://localhost:5178 ...
cd frontend
npm run dev:admin
pause
