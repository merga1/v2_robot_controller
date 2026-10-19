# PowerShell Launcher for Restaurant Delivery Robot Stack
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   BISTRO ROBOTIQUE - AUTONOMOUS DELIVERY SYSTEM" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Launching FastAPI Backend on http://localhost:8000" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\.venv\Scripts\python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "2. Launching 5 Independent Frontend Sites & Screen Launcher" -ForegroundColor Green
Write-Host "   - Guest Menu:     http://localhost:5174" -ForegroundColor Gray
Write-Host "   - Kitchen KDS:    http://localhost:5175" -ForegroundColor Gray
Write-Host "   - Chef Pass:      http://localhost:5176" -ForegroundColor Gray
Write-Host "   - Robot Screen:   http://localhost:5177" -ForegroundColor Gray
Write-Host "   - Admin Console:  http://localhost:5178" -ForegroundColor Gray
Write-Host "   - Screen Portal:  http://localhost:5173" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev:all"

Write-Host "3. Optional: Launch Mock Robot Simulator (requires Mosquitto running on port 1883)" -ForegroundColor Yellow
$choice = Read-Host "Would you like to start the Mock Robot Simulator now? (y/n)"
if ($choice -eq 'y' -or $choice -eq 'Y') {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\.venv\Scripts\python robot_gateway\mock_robot_sim.py"
}

Write-Host ""
Write-Host "All systems operational!" -ForegroundColor Green
Write-Host "Main Portal: http://localhost:5173" -ForegroundColor Cyan

