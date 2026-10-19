@echo off
title Restaurant Delivery Robot - Mock Robot Simulator
echo Starting Mock Robot Simulator (Connects to MQTT on localhost:1883)...
.\.venv\Scripts\python robot_gateway\mock_robot_sim.py
pause
