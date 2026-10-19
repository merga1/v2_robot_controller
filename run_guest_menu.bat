@echo off
title Bistro Robotique - Guest Mobile Menu (:5174)
echo ========================================================
echo   GUEST MOBILE ORDERING WEBSITE - ISOLATED HOST
echo ========================================================
echo Starting independent Guest Menu on http://localhost:5174 ...
cd frontend
npm run dev:guest
pause
