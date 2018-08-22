@echo off
npm install -g -s pm2 >nul & npm install -g -s pm2-windows-service >nul & pm2-service-install & pm2 start ./../index.js >nul & pm2 save -f >nul
