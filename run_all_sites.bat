@echo off
title Bistro Robotique - Launch All 5 Independent Sites + Launcher Portal
echo =======================================================================
echo   BISTRO ROBOTIQUE - MULTI-HOST FRONTEND SYSTEM
echo   Launching 5 Independent Sites on Dedicated Ports:
echo     - Guest Mobile Menu:           http://localhost:5174
echo     - Kitchen Display System (KDS): http://localhost:5175
echo     - Chef Pass Station:           http://localhost:5176
echo     - Robot Onboard Touch Kiosk:   http://localhost:5177
echo     - Admin Operations & Teleop:   http://localhost:5178
echo     - Hardware Screen Portal:      http://localhost:5173
echo =======================================================================
cd frontend
npm run dev:all
pause
