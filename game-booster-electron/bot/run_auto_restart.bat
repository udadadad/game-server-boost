@echo off
title CyberBoost Shop Bot - AUTO RESTART
:loop
echoStarting Bot...
call npm start
echo Bot crashed! Restarting in 3 seconds...
timeout /t 3
goto loop
