@echo off
set WS_URL=wss://determinoss.nathangracia.com/ws
set WEBCAM_DEVICE=HD Pro Webcam C920

cd /d "%~dp0"
node feeder.js
