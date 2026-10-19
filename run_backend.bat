@echo off
title Restaurant Delivery Robot - FastAPI Backend
echo Starting FastAPI Backend on http://localhost:8000 ...
.\.venv\Scripts\python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
